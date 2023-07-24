<?php
$currentUser = filter_input(INPUT_POST, "name");
$currentUserPassword = filter_input(INPUT_POST, "password");
$currentUserPepper = filter_input(INPUT_POST, "pepper");
if (isset($currentUserPepper) && $currentUserPepper != '' && isset($currentUser) && $currentUser != '' && isset($currentUserPassword) && $currentUserPassword != '' && strlen($currentUser) <= 256 && strlen($currentUserPassword) <= 256) {
	$servername = $_SERVER["HTTP_SERVER_NAME"];
	$dbUsername = $_SERVER["HTTP_USERNAME"];
	$dbPassword = $_SERVER["HTTP_PASSWORD"];
	$dbName = $_SERVER["HTTP_DB_NAME"];
	$conn = new mysqli($servername, $dbUsername, $dbPassword, $dbName);
	if ($conn->connect_error) {
  		error_log("Connection Error for user '$dbUsername' and DB name '$dbName'", 0);
		die("Connection failed: " . $conn->connect_error);
		exit;
	}
	$stmt = $conn->prepare(" SELECT PASSWORD, EMAIL FROM USER WHERE EMAIL = ? ");
	$stmt->bind_param("s", $currentUser);
	$stmt->execute();
	$stmt->store_result();
	$num_of_rows = $stmt->num_rows;
	$stmt->bind_result($password, $email);
	$num_rows = 0;
	while ($stmt->fetch()) {
		$num_rows++;
	}
	$stmt->free_result();
	if ($num_rows === 1) {
		if (!isset($password)) {
			error_log("USER has no password set!", 0);
			exit;
		}
		if (!isset($email)) {
			error_log("USER has no email set!", 0);
			exit;
		}
		$hashedPepperedHashedSaltedPassword = hash("sha512", $currentUserPepper . $password);
		if ($hashedPepperedHashedSaltedPassword === $currentUserPassword) {
			session_start();
			$_SESSION["login"] = htmlspecialchars($email);
			$_SESSION["logged_in_at"] = time();
		}
	} else if ($num_rows > 1) {
		error_log("Too many USERs in DB for input", 0);
	} else {
		error_log("No USER in DB", 0);
	}
	$stmt->close();
	$conn->close();
} else {
    error_log("Login Error - Pepper: $currentUserPepper Name: $currentUser and Pass: $currentUserPassword", 0);
}