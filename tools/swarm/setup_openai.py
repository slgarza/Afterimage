#!/usr/bin/env python3
"""Store a project API key in Modal without putting it in argv, Git, or logs."""

import getpass
import json
import urllib.error
import urllib.request

import modal

SECRET_NAME = "afterimage-openai"


def main():
    print("Afterimage: conectar OpenAI con Modal")
    print("Introduce una clave de proyecto de OpenAI. La entrada queda oculta.")
    key = getpass.getpass("OpenAI API key: ").strip()
    if not key:
        raise SystemExit("No se guardo ninguna clave.")
    request = urllib.request.Request(
        "https://api.openai.com/v1/models",
        headers={"Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            models = {item["id"] for item in json.load(response)["data"]}
    except urllib.error.HTTPError as error:
        raise SystemExit(
            f"OpenAI rechazo la comprobacion: HTTP {error.code}."
        ) from None
    except urllib.error.URLError:
        raise SystemExit(
            "No fue posible conectar con OpenAI; no se guardo la clave."
        ) from None
    modal.Secret.objects.create(
        SECRET_NAME, {"CODEX_API_KEY": key}, environment_name="main"
    )
    print(f"Credencial guardada en Modal como {SECRET_NAME} (entorno main).")
    print("Modelo gpt-6.1-sol disponible:", "si" if "gpt-6.1-sol" in models else "no")
    print("Listo. Puedes cerrar esta ventana y volver al chat.")
    input("Pulsa Enter para cerrar.")


if __name__ == "__main__":
    main()
