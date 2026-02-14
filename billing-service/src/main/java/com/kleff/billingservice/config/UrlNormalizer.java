package com.kleff.billingservice.config;

import java.net.URI;

public final class UrlNormalizer {

    private UrlNormalizer() {
    }

    public static String toAbsoluteBaseUrl(String rawUrl, String propertyName) {
        String value = rawUrl == null ? "" : rawUrl.trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException(propertyName + " is required");
        }

        // Accept host-only values from env (e.g., api.kleff.io) by defaulting to http.
        if (!value.matches("^[a-zA-Z][a-zA-Z0-9+.-]*://.*$")) {
            value = "http://" + value;
        }

        // RestClient baseUrl should not end with a trailing slash.
        value = value.replaceAll("/+$", "");

        URI uri = URI.create(value);
        if (uri.getScheme() == null || uri.getHost() == null) {
            throw new IllegalArgumentException(propertyName + " must be an absolute URL");
        }

        return value;
    }
}
