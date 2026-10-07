#!/bin/sh
# Junta os modulos em um unico index.html (rode dentro da pasta src/)
cat q2.js q3.js q4.js rig4.js robot3d.js q5.js q6.js q7.js > /tmp/app.js
{ echo '<!doctype html>'; echo '<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'; cat q1.html; echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'; echo '<script>'; cat /tmp/app.js; echo '</script>'; echo '</html>'; } > ../index.html
echo "index.html gerado"
