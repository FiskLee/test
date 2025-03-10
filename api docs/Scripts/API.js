/* eslint eqeqeq: "off", curly: "error", "no-extra-parens": "off" */
/* eslint-disable require-atomic-updates */
/* global UI */

const API = (function () {
    "use strict";

    let modules = { Core: { GetAPISpec: [] } };

    let sessionID = "";
    let requestRoot = window.location.origin;
    let dataSource = requestRoot + "/API";
    let requestTimeout = 120000;
    let failureCallback = () => {};
    let defaultErrorHandler = null;
    let poorNetworkCallback = () => {};
    let networkRecoverCallback = () => {};
    let poorNetworkLimit = 32;
    let deadNetworkLimit = 4;
    let recoveredNetworkLimit = 16;
    let slowNetworkTriggered = false;
    let deadNetworkTriggered = false;
    let websocketFailures = 0;
    let ws = null;

    const APIObject = APIBase();

    function APIBase() {
        let wsEnabled = false;
        let wsDisabled = false;

        return {
            SetAPIBase: function (root) {
                requestRoot = root;
                wsDisabled = true; //temporary until ADS WS proxy is implemented
            },
            SetupAsync: async function (NetworkFailCallback, ErrorHandlerCallback, NetworkRecoveredCallback) {
                poorNetworkCallback = NetworkFailCallback;
                defaultErrorHandler = ErrorHandlerCallback;
                networkRecoverCallback = NetworkRecoveredCallback;
                dataSource = requestRoot + "/API";
                return await initAsync();
            },
            ClearSessionId: function () {
                sessionID = "";
            },
            SetSessionIDAsync: async function (id) {
                sessionID = id;
                localStorage["LastSessionID"] = id;
                return await initAsync();
            },
            GetSessionID: () => sessionID,
            WebsocketsEnabled: () => wsEnabled,
            EnableWebsockets: function (messageReceivedCallback) {
                return new Promise(function (resolve, reject) {
                    if (messageReceivedCallback == null || wsEnabled || wsDisabled) { resolve(); }

                    async function reconnect() {
                        websocketFailures++;

                        if (websocketFailures > 5) {
                            console.log("Disabling Websockets due to excessive failures");
                            wsDisabled = true;
                            wsEnabled = false;
                            return;
                        }

                        console.log("Websocket connection closed, reconnecting after 1s...");
                        await sleepAsync(1000);
                        wsEnabled = false;
                        API.EnableWebsockets(messageReceivedCallback);
                    }

                    console.log("Enabling websocket...");

                    const loc = window.location;
                    const wsProtocol = loc.protocol === "https:" ? "wss:" : "ws:";
                    const new_uri = `${wsProtocol}//${loc.host}/stream/${sessionID}`;

                    try {
                        ws = new WebSocket(new_uri);
                        ws.onmessage = function (event) {
                            websocketFailures = 0;
                            const msg = JSON.parse(event.data);
                            messageReceivedCallback(msg);
                        };
                        ws.onopen = function () {
                            console.log("Websocket connected OK");
                            wsEnabled = true;
                            websocketFailures = 0;
                            resolve();
                        };
                        ws.onerror = reject;
                        ws.onclose = reconnect;
                    }
                    catch (ex) {
                        reconnect();
                        reject();
                    }
                });
            },
            ResetBadNetwork: function () {
                pendingRequests = 0;
                errorRequests = 0;
                slowNetworkTriggered = false;
                deadNetworkTriggered = false;
            },
            GetBadNetworkState: () => slowNetworkTriggered || deadNetworkTriggered,
            NotifyTaskComplete: taskComplete,
            NotifyTaskError: taskError
        };
    }

    let pendingTasks = {};
    let pendingErrors = {};

    function taskComplete(taskId) {
        (pendingTasks[taskId] || function () { })();
        if (pendingTasks[taskId] != undefined) {
            delete pendingTasks[taskId];
        }
    }

    function taskError(taskId, reason) {
        (pendingErrors[taskId] || function () { })();
        if (pendingErrors[taskId] != undefined) {
            delete pendingErrors[taskId];
        }
    }

    async function initAsync(stage2) {
        for (const module of Object.keys(modules)) {
            const methods = modules[module];
            APIObject[module] = {};

            Object.keys(methods).forEach(function (method) {
                APIObject[module][method] = function () {
                    //console.log(`Legacy method invocation: API.${module}.${method}`);
                    APICall(module, method, Array.prototype.slice.call(arguments, 0));
                };

                APIObject[module][method + "Async"] = function (params) {
                    const args = Array.prototype.slice.call(arguments, 0);
                    return new Promise(function (resolve, reject) {
                        APICall(module, method, args, resolve, reject);
                    });
                };

                APIObject[module][method + "TaskAsync"] = async function (params) {
                    const args = Array.prototype.slice.call(arguments, 0);
                    const result = await new Promise(function (resolve, reject) {
                        APICall(module, method, args, resolve, reject);
                    });

                    result.waitCompleteAsync = function () {
                        if (result.Status) {
                            return new Promise(function (accept) {
                                pendingTasks[result.Id] = accept;
                            });
                        }
                        else {
                            console.log("Tried to create a task notifier for a failed task.");
                            return Promise.resolve();
                        }
                    }

                    result.onError = function (callback) {
                        if (result.Status) {
                            pendingTasks[result.Id] = callback;
                        }
                        else {
                            console.log("Tried to create a task notifier for an (already) failed task.");
                        }
                        return result;
                    }

                    result.onComplete = function (callback) {
                        //.Status only exists if an ActionResult was returned instead of a RunningTask.
                        if (result.Status) {
                            pendingTasks[result.Id] = callback;
                        }
                        else {
                            console.log("Tried to create a task notifier for a failed task.");
                        }
                        return result;
                    };

                    return result;
                };

                APIObject[module][method + "WsSend"] = function (params) {
                    const args = Array.prototype.slice.call(arguments, 0);
                    sendWSData(module, method, args);
                };

                APIObject[module][method].currentInterval = 0;

                APIObject[module][method].setInterval = function (timeout, callback, failureCallback) {
                    if (this.currentInterval === 0) {
                        this.currentInterval = setInterval(this, timeout, callback, failureCallback);
                    }
                };

                APIObject[module][method].clearInterval = function () {
                    if (this.currentInterval !== 0) {
                        clearInterval(this.currentInterval);
                        this.currentInterval = 0;
                    }
                };
            });
        }

        if (stage2) {
            return true;
        }
        else {
            let result;
            try {
                result = await APIObject.Core.GetAPISpecAsync();
            }
            catch
            {
                return false;
            }
            if (result != null) {
                if (result.hasOwnProperty("Message")) { //API init failed.
                    return false;
                }
                modules = result;
                return await initAsync(true);
            }
            else {
                return false;
            }
        }
    }

    function getParamNames(fn) {
        if (fn === null || fn === undefined) { return []; }
        const funStr = fn.toString();
        return funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(/([^\s,]+)/g);
    }

    //Invokes a method, using values from params KVP as arguments.
    function dynamicInvoke(method, params, context) {
        let args = [];

        if (params == null) {
            method();
            return;
        }

        const pNames = getParamNames(method);

        //The callback no arguments, or has only 1 argument with a name of `data` - give it the response verbatim. 
        if (pNames == null || (pNames != null && pNames.length > 0 && pNames[0] === "data")) {
            args = [params];
        }
        //Match the response fields to the callbacks arguments by name.
        else {
            pNames.forEach(function (paramName) {
                if (params[paramName] !== undefined) {
                    args.push(params[paramName]);
                } else {
                    args.push(null); //Keep parameters in order by filling empty spaces with null
                }
            });
        }

        method.apply(context, args);
    }

    //jqXHR, textStatus, errorThrown, module, methodName, data, callback
    function errorHandler() {
        if (failureCallback.apply(this, arguments) === null) {
            //If nothing was returned, handle it ourselves.
            //How though?
        }
    }

    let pendingRequests = 0;
    let errorRequests = 0;

    function sendWSData(module, methodName, data) {
        if (ws == null) { return; }

        const params = {};
        const paramInfo = modules[module][methodName].Parameters;
        for (let i = 0; i < data.length; i++) {
            params[paramInfo[i].Name] = data[i];
        }

        const payload = {
            Module: module,
            Method: methodName,
            Params: params,
            MessageId: 0
        };
        ws.send(JSON.stringify(payload));
    }

    function checkPendingRequestState() {
        if (pendingRequests > poorNetworkLimit && slowNetworkTriggered === false) {
            console.log(`Poor network environment, ${pendingRequests} requests have been queued up/failed...`);
            slowNetworkTriggered = true;
            poorNetworkCallback(pendingRequests);
        }
        else if (pendingRequests < recoveredNetworkLimit && slowNetworkTriggered) {
            console.log(`Network is recovering, ${pendingRequests} requests remain queued up.`);
            slowNetworkTriggered = false;
            networkRecoverCallback(pendingRequests);
        }
    }

    function requestData(module, methodName, data, callback, failureCallback) {
        const URI = dataSource + "/" + module + "/" + methodName;

        if (failureCallback == null) {
            failureCallback = defaultErrorHandler;
        }

        data.SESSIONID = sessionID;

        pendingRequests++;

        checkPendingRequestState();

        $.ajax({
            type: "POST",
            url: URI,
            data: JSON.stringify(data),
            dataType: 'json',
            jsonp: false,
            timeout: requestTimeout,
            success: function (response) { //, textStatus, jqXHR
                pendingRequests--;
                errorRequests = 0;
                checkPendingRequestState();

                if (response?.Error && failureCallback != null) {
                    const errorObject = {
                        module: module,
                        method: methodName,
                        data: data,
                        error: response
                    };

                    dynamicInvoke(failureCallback, errorObject, this);
                }
                else if (callback != null) {
                    dynamicInvoke(callback, response, this);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) { //Only applies to comms errors, not to exceptions from successfully made API calls.
                pendingRequests--;
                errorRequests++;
                errorHandler(jqXHR, textStatus, errorThrown, module, methodName, data, callback);
                console.log(`Failed to make API call to ${module}.${methodName} - ${errorThrown}`);
                console.error(errorThrown);

                if (errorRequests > deadNetworkLimit && deadNetworkTriggered === false) {
                    deadNetworkTriggered = true;
                    poorNetworkCallback();
                }

                //failureCallback();
            }
        });
    }

    // The callback is always the last argument, or 2nd to last if a failure is specified.
    function APICall(module, methodName, args, resolve, reject) {
        const data = {};

        const methodParams = modules[module][methodName].Parameters;
        const methodParamsLength = methodParams != null ? methodParams.length : 0;

        for (let a = 0; a < methodParamsLength; a++) {
            const argName = methodParams[a].Name;
            data[argName] = ko.unwrap(args[a]);
        }

        let callback = resolve || null;
        let failCallback = reject || null;

        if (resolve == null && args.length == (methodParamsLength + 1)) {
            callback = args[args.length - 1];
        }
        else if (reject == null && args.length == (methodParamsLength + 2)) {
            callback = args[args.length - 2];
            failCallback = args[args.length - 1];
        }

        requestData(module, methodName, data, callback, failCallback);
    }

    return APIObject;
})();
