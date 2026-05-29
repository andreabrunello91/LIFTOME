window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "84d1763c-7bbc-438b-a895-2230f2296e4e",
    notifyButton: { enable: false },
    serviceWorkerParam: { scope: "/" },
  });
});
