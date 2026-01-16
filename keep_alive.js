const axios = require('axios');

function keepAlive(url) {
    setInterval(() => {
        axios.get(url)
            .then(() => console.log('Self-Ping: बोट जाग रहा है! ⚡'))
            .catch(err => console.log('Ping Warning: ', err.message));
    }, 300000); // हर 5 मिनट में पिंग
}

module.exports = keepAlive;
