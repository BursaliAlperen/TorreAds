<?php
$data = json_decode(file_get_contents("php://input"), true);
$usersFile = "users.json";
$users = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : [];
$users[$data["id"]] = $data;
file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
echo "User saved";
?>
