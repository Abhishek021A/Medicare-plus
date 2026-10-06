<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/index.php/products");
curl_setopt($ch, CURLOPT_POST, 1);
$post = [
    'name' => 'Vitamin C Test PHP',
    'slug' => 'vitamin-c-test-php',
    'sku' => 'MED-VIT-C-998',
    'price' => '499',
    'stock_quantity' => '100',
    'category_id' => '1',
    'status' => 'ACTIVE'
];
curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer mock-admin-token-123"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP $httpcode\n";
echo $response;
?>
