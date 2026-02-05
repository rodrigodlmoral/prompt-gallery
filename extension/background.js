// Permite abrir el panel lateral al hacer clic en el icono de la extensión
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log("Prompt Gallery Companion Installed");
});
