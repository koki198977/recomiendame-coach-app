// Logger global de errores para debugging
export const setupErrorHandlers = () => {
  // Capturar errores no manejados
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔴 ERROR GLOBAL:', {
      isFatal,
      error: error.toString(),
      stack: error.stack,
    });
    
    // Llamar al handler original
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });

  // Capturar promesas rechazadas
  const promiseRejectionHandler = (event: any) => {
    console.error('🔴 PROMISE REJECTION:', event.reason);
  };

  // @ts-ignore
  if (typeof global.Promise !== 'undefined') {
    // @ts-ignore
    global.Promise.prototype._rejectionHandler = promiseRejectionHandler;
  }

  console.log('✅ Error handlers configurados');
};
