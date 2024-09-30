const $copyButton = document.getElementById('copy');

$copyButton.addEventListener('click', function() {
    const output = document.getElementById('output');
    
    output.disabled = false;
    output.select();

    navigator.clipboard.writeText(output.value);

    output.disabled = true;

    const $copyText = document.createElement("p");
    $copyText.textContent = "Copied !";
    $copyButton.insertAdjacentElement("afterend", $copyText);
});
