<?php
// Root health check for Render
header("Content-Type: application/json; charset=UTF-8");
http_response_code(200);
echo json_encode([
    "status" => "online",
    "message" => "Medicare PLUS API is running successfully."
]);
