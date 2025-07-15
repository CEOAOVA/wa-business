"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setContext = exports.setTag = exports.addBreadcrumb = exports.captureMessage = exports.captureException = void 0;
// Stub para @sentry/node cuando no está disponible
const captureException = (error) => {
    console.error('Error captured (Sentry not available):', error);
};
exports.captureException = captureException;
const captureMessage = (message) => {
    console.log('Message captured (Sentry not available):', message);
};
exports.captureMessage = captureMessage;
const addBreadcrumb = (breadcrumb) => {
    console.log('Breadcrumb added (Sentry not available):', breadcrumb);
};
exports.addBreadcrumb = addBreadcrumb;
const setTag = (key, value) => {
    console.log(`Tag set (Sentry not available): ${key}=${value}`);
};
exports.setTag = setTag;
const setContext = (key, context) => {
    console.log(`Context set (Sentry not available): ${key}=`, context);
};
exports.setContext = setContext;
exports.default = {
    captureException: exports.captureException,
    captureMessage: exports.captureMessage,
    addBreadcrumb: exports.addBreadcrumb,
    setTag: exports.setTag,
    setContext: exports.setContext,
};
