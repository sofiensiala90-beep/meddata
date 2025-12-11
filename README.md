# DASS (Data Analysis Statistical System)

**Property of JS GATE**

DASS is an intelligent platform designed for medical students to create, manage, and analyze medical study forms. It features an integrated AI assistant powered by the Gemini API and a virtual currency system for platform actions.

This project is set up as a "no-build" React application, meaning you can run it directly in a browser without needing complex build tools like Webpack or Vite.

## Features

- **User Authentication:** Demo-based user selection for student and admin roles.
- **Dashboard:** At-a-glance overview of statistics for both students and admins.
- **Form Builder:** A comprehensive tool to create complex medical forms with various field types (text, number, choice, conditional logic, etc.).
- **Form Management:** Validate, edit, and manage forms. Students can add responses to their validated forms.
- **Public Library:** Students can publish validated forms to a public library for others to purchase and use.
- **AI Analysis:** Leverage the Gemini API to perform natural language queries and generate analyses and charts from form response data.
- **Virtual Wallet:** A coin-based economy for platform actions like form validation, AI analysis, and form purchases.
- **Admin Panel:** A full suite of tools for admins to manage students, view all forms, monitor finances, and send notifications.
- **AI Chatbot:** An integrated assistant to help users navigate the platform's features.

## Tech Stack

- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS (via CDN)
- **AI:** Google Gemini API (`@google/genai`)

## Getting Started

### Prerequisites

- A modern web browser.
- A way to serve static files locally. We'll cover two simple methods below.
- A Google Gemini API Key.

### API Key Setup

This application requires a Google Gemini API key to function.

1.  Obtain your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  The application expects this key to be available as an environment variable named `API_KEY`. **Do not hardcode your key into the source code.**
3.  When running locally or deploying, you must ensure this environment variable is set in the execution environment.

### Running the Application Locally

Since this is a no-build project, you just need a simple local web server to serve the project files.

**Method 1: Using VS Code Live Server Extension**

1.  If you use Visual Studio Code, install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
2.  Open the project folder in VS Code.
3.  Right-click on `index.html` and select "Open with Live Server".
4.  The application will open in your default browser.
5.  **Important:** The Gemini API calls will fail unless the `API_KEY` is available. Most local server extensions don't handle environment variables. For full functionality, you'll need to deploy to a service that supports them (like Vercel) or use a local development server that can inject them.

**Method 2: Using Python's HTTP Server**

1.  Make sure you have Python installed on your system.
2.  Open a terminal or command prompt in the root directory of the project (where `index.html` is located).
3.  Run the following command:
    - For Python 3: `python -m http.server`
    - For Python 2: `python -m SimpleHTTPServer`
4.  Open your browser and navigate to `http://localhost:8000`.
5.  As with Live Server, the API key needs to be configured in your deployment environment for the AI features to work.

## Deployment to Vercel

As you mentioned, Vercel is a great option for deploying this static application.

1.  Push the code to a Git repository (e.g., GitHub, GitLab).
2.  Create a new project on [Vercel](https://vercel.com/) and import your Git repository.
3.  Vercel will automatically detect it as a static site. No special build commands are needed.
4.  **Crucially**, go to your project's settings in Vercel, navigate to the "Environment Variables" section, and add a new variable:
    - **Name:** `API_KEY`
    - **Value:** Paste your Google Gemini API key here.
5.  Deploy the project. Your DASS application will now be live with full AI functionality.