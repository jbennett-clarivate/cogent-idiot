const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the Angular dist directory
app.use(express.static(path.join(__dirname, 'dist/cogent-idiot')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API route for tools data
app.get('/api/tools', (req, res) => {
  const tools = [
    { id: 'bayes', name: 'Bayes Calculator', description: 'Bayesian probability calculator' },
    { id: 'listclean', name: 'List Cleaner', description: 'Clean and format lists' },
    { id: 'listcomparator', name: 'List Comparator', description: 'Compare two lists' },
    { id: 'listiterator', name: 'List Iterator', description: 'Iterate through lists' },
    { id: 'listrandom', name: 'List Random', description: 'Random list operations' },
    { id: 'message', name: 'Message Tool', description: 'Message utilities' },
    { id: 'pascal', name: 'Pascal Triangle', description: 'Generate Pascal triangle' },
    { id: 'safecron', name: 'Safe Cron', description: 'Cron job utilities' },
    { id: 'taxes', name: 'Tax Calculator', description: 'Tax calculation tools' }
  ];
  res.json(tools);
});

// Catch all handler: send back Angular's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/cogent-idiot/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
