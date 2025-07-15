// Stub para @sentry/node cuando no está disponible
export const captureException = (error: any) => {
  console.error('Error captured (Sentry not available):', error);
};

export const captureMessage = (message: string) => {
  console.log('Message captured (Sentry not available):', message);
};

export const addBreadcrumb = (breadcrumb: any) => {
  console.log('Breadcrumb added (Sentry not available):', breadcrumb);
};

export const setTag = (key: string, value: string) => {
  console.log(`Tag set (Sentry not available): ${key}=${value}`);
};

export const setContext = (key: string, context: any) => {
  console.log(`Context set (Sentry not available): ${key}=`, context);
};

export default {
  captureException,
  captureMessage,
  addBreadcrumb,
  setTag,
  setContext,
}; 