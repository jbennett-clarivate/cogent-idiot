<?php
$login = isset($_SESSION["login"]);
if ($login) {
	$_SESSION["logged_in_at"] = time();
	return true;
}
return false;
