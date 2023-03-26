mkdir tgs && cd svg && for file in *.svg; do lottie_convert.py "$file" "../tgs/${file/.svg/.tgs}"; done && cd ../tgs && zip -r tgs.zip ./*
