var APP_CONFIG = {
    // Point IDs to hide from the results page entirely.
    excludePoints: [
        "HEIGHT",
        "WEIGHT",
        "WAIST_CIRCUM"
    ],
    qrCodeResults: {
        // Set to true to show a Share button on the results screen that generates a QR code.
        enabled: true,
        // URL base for the QR code. The encoded results (?r=) and measurement ID (?mid=)
        // are appended automatically. Pages opened via QR code are automatically detected
        // as standalone (no Exit/Try Again buttons) because the ?r= param is present.
        // Leave empty to use the current page's own URL
        url: ""
    }
};
