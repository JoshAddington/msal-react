'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var msalBrowser = require('@azure/msal-browser');

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Stubbed context implementation
 * Only used when there is no provider, which is an unsupported scenario
 */

const defaultMsalContext = {
  instance: msalBrowser.stubbedPublicClientApplication,
  inProgress: msalBrowser.InteractionStatus.None,
  accounts: [],
  logger: /*#__PURE__*/new msalBrowser.Logger({})
};
const MsalContext = /*#__PURE__*/React.createContext(defaultMsalContext);
const MsalConsumer = MsalContext.Consumer;

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function getChildrenOrFunction(children, args) {
  if (typeof children === "function") {
    return children(args);
  }

  return children;
}
/**
 * Helper function to determine whether 2 arrays are equal
 * Used to avoid unnecessary state updates
 * @param arrayA
 * @param arrayB
 */

function accountArraysAreEqual(arrayA, arrayB) {
  if (arrayA.length !== arrayB.length) {
    return false;
  }

  const comparisonArray = [...arrayB];
  return arrayA.every(elementA => {
    const elementB = comparisonArray.shift();

    if (!elementA || !elementB) {
      return false;
    }

    return elementA.homeAccountId === elementB.homeAccountId && elementA.localAccountId === elementB.localAccountId && elementA.username === elementB.username;
  });
}
function getAccountByIdentifiers(allAccounts, accountIdentifiers) {
  if (allAccounts.length > 0 && (accountIdentifiers.homeAccountId || accountIdentifiers.localAccountId || accountIdentifiers.username)) {
    const matchedAccounts = allAccounts.filter(accountObj => {
      if (accountIdentifiers.username && accountIdentifiers.username.toLowerCase() !== accountObj.username.toLowerCase()) {
        return false;
      }

      if (accountIdentifiers.homeAccountId && accountIdentifiers.homeAccountId.toLowerCase() !== accountObj.homeAccountId.toLowerCase()) {
        return false;
      }

      if (accountIdentifiers.localAccountId && accountIdentifiers.localAccountId.toLowerCase() !== accountObj.localAccountId.toLowerCase()) {
        return false;
      }

      return true;
    });
    return matchedAccounts[0] || null;
  } else {
    return null;
  }
}

/* eslint-disable header/header */
const name = "@azure/msal-react";
const version = "1.5.9";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var MsalProviderActionType;

(function (MsalProviderActionType) {
  MsalProviderActionType["UNBLOCK_INPROGRESS"] = "UNBLOCK_INPROGRESS";
  MsalProviderActionType["EVENT"] = "EVENT";
})(MsalProviderActionType || (MsalProviderActionType = {}));
/**
 * Returns the next inProgress and accounts state based on event message
 * @param previousState
 * @param action
 */


const reducer = (previousState, action) => {
  const {
    type,
    payload
  } = action;
  let newInProgress = previousState.inProgress;

  switch (type) {
    case MsalProviderActionType.UNBLOCK_INPROGRESS:
      if (previousState.inProgress === msalBrowser.InteractionStatus.Startup) {
        newInProgress = msalBrowser.InteractionStatus.None;
        payload.logger.info("MsalProvider - handleRedirectPromise resolved, setting inProgress to 'none'");
      }

      break;

    case MsalProviderActionType.EVENT:
      const message = payload.message;
      const status = msalBrowser.EventMessageUtils.getInteractionStatusFromEvent(message, previousState.inProgress);

      if (status) {
        payload.logger.info(`MsalProvider - ${message.eventType} results in setting inProgress from ${previousState.inProgress} to ${status}`);
        newInProgress = status;
      }

      break;

    default:
      throw new Error(`Unknown action type: ${type}`);
  }

  const currentAccounts = payload.instance.getAllAccounts();

  if (newInProgress !== previousState.inProgress && !accountArraysAreEqual(currentAccounts, previousState.accounts)) {
    // Both inProgress and accounts changed
    return { ...previousState,
      inProgress: newInProgress,
      accounts: currentAccounts
    };
  } else if (newInProgress !== previousState.inProgress) {
    // Only only inProgress changed
    return { ...previousState,
      inProgress: newInProgress
    };
  } else if (!accountArraysAreEqual(currentAccounts, previousState.accounts)) {
    // Only accounts changed
    return { ...previousState,
      accounts: currentAccounts
    };
  } else {
    // Nothing changed
    return previousState;
  }
};
/**
 * MSAL context provider component. This must be rendered above any other components that use MSAL.
 */


function MsalProvider(_ref) {
  let {
    instance,
    children
  } = _ref;
  React.useEffect(() => {
    instance.initializeWrapperLibrary(msalBrowser.WrapperSKU.React, version);
  }, [instance]); // Create a logger instance for msal-react with the same options as PublicClientApplication

  const logger = React.useMemo(() => {
    return instance.getLogger().clone(name, version);
  }, [instance]);
  const [state, updateState] = React.useReducer(reducer, undefined, () => {
    // Lazy initialization of the initial state
    return {
      inProgress: msalBrowser.InteractionStatus.Startup,
      accounts: instance.getAllAccounts()
    };
  });
  React.useEffect(() => {
    const callbackId = instance.addEventCallback(message => {
      updateState({
        payload: {
          instance,
          logger,
          message
        },
        type: MsalProviderActionType.EVENT
      });
    });
    logger.verbose(`MsalProvider - Registered event callback with id: ${callbackId}`);
    instance.initialize().then(() => {
      instance.handleRedirectPromise().catch(() => {
        // Errors should be handled by listening to the LOGIN_FAILURE event
        return;
      }).finally(() => {
        /*
         * If handleRedirectPromise returns a cached promise the necessary events may not be fired
         * This is a fallback to prevent inProgress from getting stuck in 'startup'
         */
        updateState({
          payload: {
            instance,
            logger
          },
          type: MsalProviderActionType.UNBLOCK_INPROGRESS
        });
      });
    });
    return () => {
      // Remove callback when component unmounts or accounts change
      if (callbackId) {
        logger.verbose(`MsalProvider - Removing event callback ${callbackId}`);
        instance.removeEventCallback(callbackId);
      }
    };
  }, [instance, logger]);
  const contextValue = {
    instance,
    inProgress: state.inProgress,
    accounts: state.accounts,
    logger
  };
  return React__default.createElement(MsalContext.Provider, {
    value: contextValue
  }, children);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns Msal Context values
 */

const useMsal = () => React.useContext(MsalContext);

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

function isAuthenticated(allAccounts, matchAccount) {
    return true;
  if (matchAccount && (matchAccount.username || matchAccount.homeAccountId || matchAccount.localAccountId)) {
    return !!getAccountByIdentifiers(allAccounts, matchAccount);
  }

  return allAccounts.length > 0;
}
/**
 * Returns whether or not a user is currently signed-in. Optionally provide 1 or more accountIdentifiers to determine if a specific user is signed-in
 * @param matchAccount
 */


function useIsAuthenticated(matchAccount) {
  return true;
  const {
    accounts: allAccounts,
    inProgress
  } = useMsal();
  const [hasAuthenticated, setHasAuthenticated] = React.useState(() => {
    if (inProgress === msalBrowser.InteractionStatus.Startup) {
      return false;
    }

    return isAuthenticated(allAccounts, matchAccount);
  });
  React.useEffect(() => {
    setHasAuthenticated(isAuthenticated(allAccounts, matchAccount));
  }, [allAccounts, matchAccount]);
  return hasAuthenticated;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Renders child components if user is authenticated
 * @param props
 */

function AuthenticatedTemplate(_ref) {
  let {
    username,
    homeAccountId,
    localAccountId,
    children
  } = _ref;
  const context = useMsal();
  const accountIdentifier = React.useMemo(() => {
    return {
      username,
      homeAccountId,
      localAccountId
    };
  }, [username, homeAccountId, localAccountId]);
  const isAuthenticated = useIsAuthenticated(accountIdentifier);

  if (true) {
    return React__default.createElement(React__default.Fragment, null, getChildrenOrFunction(children, context));
  }

  return null;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Renders child components if user is unauthenticated
 * @param props
 */

function UnauthenticatedTemplate(_ref) {
  let {
    username,
    homeAccountId,
    localAccountId,
    children
  } = _ref;
  const context = useMsal();
  const accountIdentifier = React.useMemo(() => {
    return {
      username,
      homeAccountId,
      localAccountId
    };
  }, [username, homeAccountId, localAccountId]);
  const isAuthenticated = useIsAuthenticated(accountIdentifier);

  if (false) {
    return React__default.createElement(React__default.Fragment, null, getChildrenOrFunction(children, context));
  }

  return null;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

function getAccount(instance, accountIdentifiers) {
  if (!accountIdentifiers || !accountIdentifiers.homeAccountId && !accountIdentifiers.localAccountId && !accountIdentifiers.username) {
    // If no account identifiers are provided, return active account
    return instance.getActiveAccount();
  }

  return getAccountByIdentifiers(instance.getAllAccounts(), accountIdentifiers);
}
/**
 * Given 1 or more accountIdentifiers, returns the Account object if the user is signed-in
 * @param accountIdentifiers
 */


function useAccount(accountIdentifiers) {
  const {
    instance,
    inProgress,
    logger
  } = useMsal();
  const [account, setAccount] = React.useState(() => getAccount(instance, accountIdentifiers));
  React.useEffect(() => {
    setAccount(currentAccount => {
      const nextAccount = getAccount(instance, accountIdentifiers);

      if (!msalBrowser.AccountEntity.accountInfoIsEqual(currentAccount, nextAccount, true)) {
        logger.info("useAccount - Updating account");
        return nextAccount;
      }

      return currentAccount;
    });
  }, [inProgress, accountIdentifiers, instance, logger]);
  return account;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ReactAuthErrorMessage = {
  invalidInteractionType: {
    code: "invalid_interaction_type",
    desc: "The provided interaction type is invalid."
  },
  unableToFallbackToInteraction: {
    code: "unable_to_fallback_to_interaction",
    desc: "Interaction is required but another interaction is already in progress. Please try again when the current interaction is complete."
  }
};
class ReactAuthError extends msalBrowser.AuthError {
  constructor(errorCode, errorMessage) {
    super(errorCode, errorMessage);
    Object.setPrototypeOf(this, ReactAuthError.prototype);
    this.name = "ReactAuthError";
  }

  static createInvalidInteractionTypeError() {
    return new ReactAuthError(ReactAuthErrorMessage.invalidInteractionType.code, ReactAuthErrorMessage.invalidInteractionType.desc);
  }

  static createUnableToFallbackToInteractionError() {
    return new ReactAuthError(ReactAuthErrorMessage.unableToFallbackToInteraction.code, ReactAuthErrorMessage.unableToFallbackToInteraction.desc);
  }

}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * If a user is not currently signed in this hook invokes a login. Failed logins can be retried using the login callback returned.
 * If a user is currently signed in this hook attempts to acquire a token. Subsequent token requests can use the acquireToken callback returned.
 * Optionally provide a request object to be used in the login/acquireToken call.
 * Optionally provide a specific user that should be logged in.
 * @param interactionType
 * @param authenticationRequest
 * @param accountIdentifiers
 */

function useMsalAuthentication(interactionType, authenticationRequest, accountIdentifiers) {
  const {
    instance,
    inProgress,
    logger
  } = useMsal();
  const isAuthenticated = useIsAuthenticated(accountIdentifiers);
  const account = useAccount(accountIdentifiers);
  const [[result, error], setResponse] = React.useState([null, null]); // Used to prevent state updates after unmount

  const mounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []); // Boolean used to check if interaction is in progress in acquireTokenSilent fallback. Use Ref instead of state to prevent acquireToken function from being regenerated on each change to interactionInProgress value

  const interactionInProgress = React.useRef(inProgress !== msalBrowser.InteractionStatus.None);
  React.useEffect(() => {
    interactionInProgress.current = inProgress !== msalBrowser.InteractionStatus.None;
  }, [inProgress]); // Flag used to control when the hook calls login/acquireToken

  const shouldAcquireToken = React.useRef(true);
  React.useEffect(() => {
    if (!!error) {
      // Errors should be handled by consuming component
      shouldAcquireToken.current = false;
      return;
    }

    if (!!result) {
      // Token has already been acquired, consuming component/application is responsible for renewing
      shouldAcquireToken.current = false;
      return;
    }
  }, [error, result]);
  const login = React.useCallback(async (callbackInteractionType, callbackRequest) => {
    const loginType = callbackInteractionType || interactionType;
    const loginRequest = callbackRequest || authenticationRequest;

    switch (loginType) {
      case msalBrowser.InteractionType.Popup:
        logger.verbose("useMsalAuthentication - Calling loginPopup");
        return instance.loginPopup(loginRequest);

      case msalBrowser.InteractionType.Redirect:
        // This promise is not expected to resolve due to full frame redirect
        logger.verbose("useMsalAuthentication - Calling loginRedirect");
        return instance.loginRedirect(loginRequest).then(null);

      case msalBrowser.InteractionType.Silent:
        logger.verbose("useMsalAuthentication - Calling ssoSilent");
        return instance.ssoSilent(loginRequest);

      default:
        throw ReactAuthError.createInvalidInteractionTypeError();
    }
  }, [instance, interactionType, authenticationRequest, logger]);
  const acquireToken = React.useCallback(async (callbackInteractionType, callbackRequest) => {
    const fallbackInteractionType = callbackInteractionType || interactionType;
    let tokenRequest;

    if (callbackRequest) {
      logger.trace("useMsalAuthentication - acquireToken - Using request provided in the callback");
      tokenRequest = { ...callbackRequest
      };
    } else if (authenticationRequest) {
      logger.trace("useMsalAuthentication - acquireToken - Using request provided in the hook");
      tokenRequest = { ...authenticationRequest,
        scopes: authenticationRequest.scopes || msalBrowser.OIDC_DEFAULT_SCOPES
      };
    } else {
      logger.trace("useMsalAuthentication - acquireToken - No request object provided, using default request.");
      tokenRequest = {
        scopes: msalBrowser.OIDC_DEFAULT_SCOPES
      };
    }

    if (!tokenRequest.account && account) {
      logger.trace("useMsalAuthentication - acquireToken - Attaching account to request");
      tokenRequest.account = account;
    }

    const getToken = async () => {
      logger.verbose("useMsalAuthentication - Calling acquireTokenSilent");
      return instance.acquireTokenSilent(tokenRequest).catch(async e => {
        if (e instanceof msalBrowser.InteractionRequiredAuthError) {
          if (!interactionInProgress.current) {
            logger.error("useMsalAuthentication - Interaction required, falling back to interaction");
            return login(fallbackInteractionType, tokenRequest);
          } else {
            logger.error("useMsalAuthentication - Interaction required but is already in progress. Please try again, if needed, after interaction completes.");
            throw ReactAuthError.createUnableToFallbackToInteractionError();
          }
        }

        throw e;
      });
    };

    return getToken().then(response => {
      if (mounted.current) {
        setResponse([response, null]);
      }

      return response;
    }).catch(e => {
      if (mounted.current) {
        setResponse([null, e]);
      }

      throw e;
    });
  }, [instance, interactionType, authenticationRequest, logger, account, login]);
  React.useEffect(() => {
    const callbackId = instance.addEventCallback(message => {
      switch (message.eventType) {
        case msalBrowser.EventType.LOGIN_SUCCESS:
        case msalBrowser.EventType.SSO_SILENT_SUCCESS:
          if (message.payload) {
            setResponse([message.payload, null]);
          }

          break;

        case msalBrowser.EventType.LOGIN_FAILURE:
        case msalBrowser.EventType.SSO_SILENT_FAILURE:
          if (message.error) {
            setResponse([null, message.error]);
          }

          break;
      }
    });
    logger.verbose(`useMsalAuthentication - Registered event callback with id: ${callbackId}`);
    return () => {
      if (callbackId) {
        logger.verbose(`useMsalAuthentication - Removing event callback ${callbackId}`);
        instance.removeEventCallback(callbackId);
      }
    };
  }, [instance, logger]);
  React.useEffect(() => {
    if (shouldAcquireToken.current && inProgress === msalBrowser.InteractionStatus.None) {
      shouldAcquireToken.current = false;

      if (!isAuthenticated) {
        logger.info("useMsalAuthentication - No user is authenticated, attempting to login");
        login().catch(() => {
          // Errors are saved in state above
          return;
        });
      } else if (account) {
        logger.info("useMsalAuthentication - User is authenticated, attempting to acquire token");
        acquireToken().catch(() => {
          // Errors are saved in state above
          return;
        });
      }
    }
  }, [isAuthenticated, account, inProgress, login, acquireToken, logger]);
  return {
    login,
    acquireToken,
    result,
    error
  };
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Attempts to authenticate user if not already authenticated, then renders child components
 * @param props
 */

function MsalAuthenticationTemplate(_ref) {
  let {
    interactionType,
    username,
    homeAccountId,
    localAccountId,
    authenticationRequest,
    loadingComponent: LoadingComponent,
    errorComponent: ErrorComponent,
    children
  } = _ref;
  const accountIdentifier = React.useMemo(() => {
    return {
      username,
      homeAccountId,
      localAccountId
    };
  }, [username, homeAccountId, localAccountId]);
  const context = useMsal();
  const msalAuthResult = useMsalAuthentication(interactionType, authenticationRequest, accountIdentifier);
  const isAuthenticated = useIsAuthenticated(accountIdentifier);

  if (msalAuthResult.error && context.inProgress === msalBrowser.InteractionStatus.None) {
    if (!!ErrorComponent) {
      return React__default.createElement(ErrorComponent, Object.assign({}, msalAuthResult));
    }

    throw msalAuthResult.error;
  }

  if (isAuthenticated) {
    return React__default.createElement(React__default.Fragment, null, getChildrenOrFunction(children, msalAuthResult));
  }

  if (!!LoadingComponent && context.inProgress !== msalBrowser.InteractionStatus.None) {
    return React__default.createElement(LoadingComponent, Object.assign({}, context));
  }

  return null;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Higher order component wraps provided component with msal by injecting msal context values into the component's props
 * @param Component
 */

const withMsal = Component => {
  const ComponentWithMsal = props => {
    const msal = useMsal();
    return React__default.createElement(Component, Object.assign({}, props, {
      msalContext: msal
    }));
  };

  const componentName = Component.displayName || Component.name || "Component";
  ComponentWithMsal.displayName = `withMsal(${componentName})`;
  return ComponentWithMsal;
};

exports.AuthenticatedTemplate = AuthenticatedTemplate;
exports.MsalAuthenticationTemplate = MsalAuthenticationTemplate;
exports.MsalConsumer = MsalConsumer;
exports.MsalContext = MsalContext;
exports.MsalProvider = MsalProvider;
exports.UnauthenticatedTemplate = UnauthenticatedTemplate;
exports.useAccount = useAccount;
exports.useIsAuthenticated = useIsAuthenticated;
exports.useMsal = useMsal;
exports.useMsalAuthentication = useMsalAuthentication;
exports.version = version;
exports.withMsal = withMsal;
//# sourceMappingURL=msal-react.cjs.development.js.map
