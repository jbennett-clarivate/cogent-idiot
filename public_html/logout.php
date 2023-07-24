<?php
session_start();
unset($_SESSION["login"]);
unset($_SESSION["logged_in_at"]);
$_SESSION = array();
header("Location: tools.phtml");
