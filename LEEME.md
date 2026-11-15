# DODO · Central — cómo instalarla

Celular Android y computadora (Mac y Windows). Los datos (contactos, plata, kit, oportunidades marcadas) quedan en una planilla de Google de la banda y se ven igual en todos los dispositivos.

Hay que hacer el **paso 1 una sola vez**, con la cuenta de Google de quien va a ser dueño de la planilla (Licha). Flor y los demás solo hacen los pasos 2 y 3.

---

## 1) Crear el servidor en Google (una sola vez, ~10 minutos)

1. Con tu cuenta de Google entrá a https://sheets.new y ponele de nombre a la planilla **"DODO · Central"**.
2. En la planilla: menú **Extensiones › Apps Script**.
3. Borrá todo lo que aparece y pegá el contenido completo del archivo **`servidor/cargador.gs`** (está en este repositorio).
4. Arriba de todo, en `MAILS`, escribí entre las comillas los mails que van a recibir los avisos, separados por coma. Ejemplo: `MAILS: "licha@gmail.com, flor@gmail.com"`. Guardá (ícono del disquete).
5. Arriba elegí la función **`autorizar`** y tocá **Ejecutar**. Google pide permisos:
   Revisar permisos › tu cuenta › **Configuración avanzada › Ir a … (no seguro) › Permitir**. Es normal: la app es de ustedes.
6. Elegí la función **`instalarAvisos`** y tocá **Ejecutar**. Esto prende los mails del radar (cada hora) y el resumen de los lunes.
7. Arriba a la derecha: **Implementar › Nueva implementación**.
   - Tipo (engranaje): **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario**.
   - **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`). Esa es la *dirección del servidor*.

El servidor se actualiza solo desde este repositorio: no hace falta volver a pegar nada.

## 2) Instalar la app

- **Android:** descargá `DODO.apk` (carpeta `descargas`) en el celular y abrilo. Si pregunta, permití "instalar apps de origen desconocido" para el navegador o el administrador de archivos. Al abrir la app, aceptá las **notificaciones**.
- **Windows:** descomprimí `DODO - Windows.zip` y abrí `DODO.exe`. Si Windows avisa "protegió su PC", tocá **Más información › Ejecutar de todas formas**.
- **Mac:** descomprimí el zip que corresponda (chip Apple M o Intel) y mové `DODO.app` a Aplicaciones. La primera vez: **clic derecho › Abrir › Abrir**. Si dice que está dañada, en la Terminal: `xattr -cr /Applications/DODO.app`.

En la compu, cerrar la ventana **no** cierra la app: queda al lado del reloj (bandeja) para seguir avisando, y arranca sola al prender la compu. Para cerrarla del todo: clic derecho en el ícono › Salir.

## 3) Entrar

- **La primera persona (Licha):** abrí la app, pegá la dirección del servidor y creá tu cuenta. Dejá marcado "Cargar los 67 contactos iniciales".
- **Invitar a Flor:** Más › Cuenta y socios › **Invitar a alguien** › Copiar invitación, y mandásela. Ella abre la app, pega la dirección, elige **"Tengo una invitación"** y pone el código, su nombre y su contraseña.
- **Sumar otro dispositivo propio** (por ejemplo la compu): en el celular, Más › Cuenta y socios › **Sumar otro dispositivo mío**. En la compu, pegá la dirección y elegí **"Código para vincular"**.

Todos los socios tienen los mismos permisos.

## Qué avisa y cuándo

- **Radar:** busca oportunidades cada 3 horas (party bands para cruceros, convocatorias, temporadas de verano). Las nuevas aparecen en grande arriba de todo y llegan por mail.
- **Notificaciones del celular y la compu:** oportunidades que cierran en 3 días y el mismo día, a quién toca insistir cada día, cobros y pagos pendientes, y el resumen de los lunes.
- **Mail:** oportunidades nuevas, las que cierran en 3 días o menos, y el resumen de los lunes (a los mails cargados en `MAILS`).

## Si alguien se olvida la contraseña

En Apps Script, elegí la función **`reiniciarCuentas`** y tocá Ejecutar. Se borran las cuentas (los datos no). Al abrir la app, la primera persona crea su cuenta de nuevo y vuelve a invitar al resto.

## Seguridad

- Este repositorio es público y no tiene datos de la banda: solo el código, el radar (oportunidades públicas) y los contactos iniciales (datos públicos de empresas).
- Quien controle este repositorio puede cambiar lo que hacen las apps: mantené la cuenta de GitHub con verificación en dos pasos.
