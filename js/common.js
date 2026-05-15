/**
 * Handles requests from native code.
 * Dispatches the request to the appropriate handler based on the request type.
 * @param {string} requestJson - The JSON string from native code, which is a NativeRequest object.
 */
function onNativeRequest(requestJson) {
    try {
        const request = JSON.parse(requestJson);
        const { type, data } = request;

        console.log('onNativeRequest received:', type, data);

        if (type === 'navigate') {
            const navData = JSON.parse(data);
            const { destination, paramsJson } = navData;

            const destinationUrls = {
                index: 'index.html',
                profile: 'profile.html',
                results: 'result.html'
            };

            const targetUrl = destinationUrls[destination];
            if (targetUrl) {
                console.log('Navigating to:', targetUrl);
                if (paramsJson) {
                    sessionStorage.setItem('measurementData', paramsJson);
                }
                window.location.href = targetUrl;
            }
        }
    } catch (error) {
        console.error('Error in onNativeRequest:', error);
    }
}
