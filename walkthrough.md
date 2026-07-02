# Resumen de Cambios y Guía de Verificación

Se han configurado e implementado las herramientas necesarias para la integración de SonarQube con GitHub Actions a través de tu túnel de ngrok.

## Cambios Realizados

1. **Archivo de Configuración de SonarQube**:
   - [sonar-project.properties](file:///c:/Users/Abner/Desktop/Semestre1-2026/softareSeguro/Unidad3/taller-sast1/sonar-project.properties): Configurado en la raíz del proyecto para indicarle a SonarQube que analice la carpeta `apps` y excluya dependencias, builds, pruebas y documentación redundante.
2. **Workflow de GitHub Actions**:
   - [.github/workflows/sonar.yml](file:///c:/Users/Abner/Desktop/Semestre1-2026/softareSeguro/Unidad3/taller-sast1/.github/workflows/sonar.yml): Definido para ejecutarse en cada `push` o `pull_request` en la rama `main`, corriendo el análisis de SonarQube y validando el Quality Gate.

---

## Guía Paso a Paso para la Verificación

Sigue estos pasos para finalizar la integración en tu entorno y probar el pipeline:

### Paso 1: Levantar SonarQube Localmente

Si aún no lo tienes corriendo, puedes levantar un contenedor Docker en tu máquina:

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
```

### Paso 2: Levantar el Túnel de Ngrok

Usa tu dominio estático para exponer el puerto `9000` a internet:

```bash
ngrok http 9000 --domain=miguel-unstippled-tonja.ngrok-free.dev
```

_Asegúrate de que al abrir `https://miguel-unstippled-tonja.ngrok-free.dev` en el navegador, puedas ver la página de inicio de sesión de SonarQube._

### Paso 3: Crear el Proyecto y Generar Token en SonarQube

1. Ve a `https://miguel-unstippled-tonja.ngrok-free.dev` e inicia sesión (`admin` / `admin`).
2. Crea un nuevo proyecto manualmente (**Create Project > Manually**):
   - **Project display name**: `Taller SAST Monorepo`
   - **Project key**: `taller-sast-monorepo`
3. Genera un token de acceso:
   - Haz clic en tu avatar arriba a la derecha > **My Account** > **Security**.
   - Ingresa un nombre para el token (ej. `github-actions`) y haz clic en **Generate**.
   - Copia el token generado.

### Paso 4: Configurar los Secretos en GitHub

Ve a tu repositorio en GitHub y navega a **Settings > Secrets and variables > Actions > New repository secret** y agrega los siguientes secretos:

- **`SONAR_HOST_URL`**: `https://miguel-unstippled-tonja.ngrok-free.dev`
- **`SONAR_TOKEN`**: _(El token generado en el paso anterior)_

### Paso 5: Probar el Workflow

Sube los archivos creados al repositorio de GitHub:

```bash
git add sonar-project.properties .github/workflows/sonar.yml
git commit -m "feat: add sonarqube integration with github actions"
git push origin main
```

Una vez que subas los cambios, ve a la pestaña **Actions** en GitHub y verás que el pipeline `DevSecOps - SonarQube Analysis` se iniciará automáticamente, enviará los datos a tu instancia local a través de ngrok y esperará el resultado del Quality Gate.
