<?php
// backend/controllers/LocationController.php

class LocationController {
    private $method;

    public function __construct($method) {
        $this->method = $method;
    }

    public function processRequest() {
        if ($this->method !== 'GET') {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Method not allowed"]);
            return;
        }

        $this->geocode();
    }

    private function geocode() {
        $lat = isset($_GET['lat']) ? $_GET['lat'] : null;
        $lng = isset($_GET['lng']) ? $_GET['lng'] : null;

        if (!$lat || !$lng) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing latitude or longitude"]);
            return;
        }

        // Use Nominatim OpenStreetMap API
        $url = "https://nominatim.openstreetmap.org/reverse?format=json&lat={$lat}&lon={$lng}&zoom=10&addressdetails=1";

        // Must provide a User-Agent for Nominatim
        $options = [
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: MedicarePlus/1.0\r\n"
            ]
        ];

        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);

        if ($response === FALSE) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to fetch from geocoding service"]);
            return;
        }

        $data = json_decode($response, true);

        if (isset($data['error'])) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Location not found"]);
            return;
        }

        $address = $data['address'];
        $city = $address['city'] ?? $address['town'] ?? $address['village'] ?? $address['county'] ?? 'Unknown City';
        $state = $address['state'] ?? 'Unknown State';
        $postcode = $address['postcode'] ?? '';

        $formattedAddress = "{$city}, {$state}";

        echo json_encode([
            "success" => true,
            "data" => [
                "formattedAddress" => $formattedAddress,
                "city" => $city,
                "state" => $state,
                "pincode" => $postcode,
                "lat" => $lat,
                "lng" => $lng
            ]
        ]);
    }
}
?>
