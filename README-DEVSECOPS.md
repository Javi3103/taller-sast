# Guía de Integración DevSecOps: SAST con SonarQube & GitHub Actions

Este documento detalla la configuración realizada para implementar el análisis estático de seguridad de código (SAST) en el monorepo utilizando **SonarQube Community** localmente y **GitHub Actions** en la nube, conectados a través de un túnel seguro con **Ngrok**.

---

## 🛠️ Arquitectura de la Solución

```mermaid
graph LR
    subgraph GitHub Cloud
        A[GitHub Repository] -->|Push / Pull Request| B[GitHub Actions Runner]
    end
    subgraph Internet
        B -->|Reportes a través de HTTPS| C((Túnel de Ngrok))
    end
    subgraph Entorno Local (Tu Máquina)
        C -->|Redirección de puerto 9000| D[Contenedor SonarQube]
    end
end
```

---

## 📋 Requisitos Previos
1. **Docker Desktop** instalado y en ejecución.
2. **Node.js y npm** instalados localmente.
3. Cuenta gratuita en **ngrok.com**.

---

## 🚀 Guía de Demostración Paso a Paso para la Clase

Sigue estos pasos en vivo para mostrarle el funcionamiento del pipeline al docente:

### Paso 1: Levantar SonarQube localmente (Docker)
Si ya lo tienes corriendo, puedes omitir el comando de creación, pero asegúrate de que el contenedor esté activo.
* **Comando para crearlo por primera vez:**
  ```bash
  docker run -d --name sonarqube -p 9000:9000 sonarqube:community
  ```
* **Comando para iniciarlo si ya estaba creado:**
  ```bash
  docker start sonarqube
  ```
* Comprueba que está activo abriendo en tu navegador: [http://localhost:9000](http://localhost:9000)

### Paso 2: Exponer SonarQube a internet con Ngrok
Como las IPs locales no son accesibles desde GitHub Actions, iniciamos el túnel:
```bash
npx ngrok http 9000
```
> **IMPORTANTE:** Copia la URL pública generada con `https://` (ej. `https://xxxx.ngrok-free.app`). Mantén esta terminal abierta durante toda la demostración.

### Paso 3: Actualizar el secreto `SONAR_HOST_URL` en GitHub
Debido a que cada vez que se reinicia ngrok la URL cambia (si usas una cuenta gratuita con URL dinámica):
1. Ve a tu repositorio en GitHub > **Settings** > **Secrets and variables** > **Actions**.
2. Edita el secreto `SONAR_HOST_URL`.
3. Pega la nueva URL de ngrok copiada en el Paso 2 y haz clic en **Update secret**.

*(El secreto `SONAR_TOKEN` no cambia porque tu cuenta de SonarQube local ya lo tiene guardado de forma permanente).*

### Paso 4: Demostración en Vivo (Simular un Push)
Para que el docente vea el análisis dispararse en tiempo real, realiza un cambio insignificante en cualquier archivo (por ejemplo, agrega un comentario en el código) y súbelo a GitHub:

```bash
# 1. Agregar todos los cambios
git add .

# 2. Crear un commit de prueba
git commit -m "test: trigger security scan for demo"

# 3. Subir a la nube
git push origin main
```

### Paso 5: Mostrar la ejecución en GitHub Actions
1. Abre la pestaña **Actions** en tu repositorio de GitHub.
2. Muestra el pipeline ejecutándose en vivo. Explica los pasos clave configurados en el archivo `.github/workflows/sonar.yml`:
   * **Checkout**: Descarga el código completo con historial (`fetch-depth: 0`).
   * **SonarQube Scan**: Corre el análisis y se comunica con tu máquina a través de Ngrok.
   * **Verificar Quality Gate**: Valida si el código cumple los estándares mínimos de seguridad y calidad del proyecto.

### Paso 6: Ver los Resultados en SonarQube
1. Una vez que el pipeline termine con un check verde (✅), abre el panel de SonarQube en el navegador.
2. Entra al proyecto **Taller-SAST-Monorepo**.
3. Muestra el dashboard con los resultados:
   * **Bugs y Vulnerabilidades** encontrados.
   * **Code Smells** (deuda técnica).
   * **Duplicaciones de Código**.

---

## 📂 Archivos de Configuración Creados

### 1. Workflow de GitHub Actions: `[.github/workflows/sonar.yml](file:///.github/workflows/sonar.yml)`
Define cuándo y cómo se ejecuta el escáner de SonarQube en la nube de GitHub.

### 2. Propiedades de SonarQube: `[sonar-project.properties](file:///sonar-project.properties)`
Configura los metadatos del proyecto y le dice a SonarQube qué carpetas analizar (`apps`) y cuáles excluir (`node_modules`, builds, tests, etc.) para acelerar el análisis y enfocarlo en la seguridad.
