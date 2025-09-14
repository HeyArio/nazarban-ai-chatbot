# Nazarban AI Consultation Chatbot

A professional AI-powered consultation chatbot for lead generation, built with Node.js and Claude AI.

## Features

- 🤖 Real Claude AI responses for genuine consultation
- 💬 Beautiful, modern chat interface like Claude/ChatGPT
- 📧 Automatic email collection and lead generation
- 📱 Mobile-responsive design
- ✨ Glassmorphism UI with gradient effects
- 🎯 Professional conversation flow for business consultation

## Technologies

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **AI**: Claude API (Anthropic)
- **Email**: Zoho Mail integration
- **Design**: Modern glassmorphism with Atkinson Hyperlegible font

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nazarban-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```bash
   CLAUDE_API_KEY=your_claude_api_key
   ZOHO_EMAIL=your_email@domain.com
   ZOHO_PASSWORD=your_app_password
   INTERNAL_EMAIL=leads@nazarban.com
   PORT=3000
   ```

4. **Run the application**
   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_API_KEY` | Your Claude API key from Anthropic |
| `ZOHO_EMAIL` | Zoho email for sending notifications |
| `ZOHO_PASSWORD` | Zoho app-specific password |
| `INTERNAL_EMAIL` | Email to receive lead notifications |
| `PORT` | Server port (default: 3000) |

## Deployment

### Render.com
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy automatically

### Other Platforms
- **Heroku**: Add `Procfile` with `web: node server.js`
- **Vercel**: Works out of the box
- **Railway**: Deploy directly from GitHub

## File Structure

```
nazarban-chatbot/
├── server.js              # Express server
├── package.json           # Dependencies
├── .env                   # Environment variables (not in repo)
├── public/
│   ├── index.html         # Chat interface
│   ├── logo.png          # Company logo
│   └── favicon.ico       # Favicon
└── README.md             # This file
```

## License

MIT License - Feel free to use for your projects!

---

Built with ❤️ by Nazarban Analytics-FZCO