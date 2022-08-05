<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title>SVG test</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="<?php $link = "style.css"; echo $link . "?q=" . filemtime($link);?>"></link>
  </head>
  <body style="padding: 0; margin: 0">
    <script src="<?php $link = "./index.js"; echo $link . "?q=" . filemtime($link);?>"></script>
  </body>
</html>
