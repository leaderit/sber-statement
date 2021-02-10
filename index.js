// download sber statement
'use strict'
// Read the .env file.
require("dotenv").config()
const sber = require('./sber-statement')
const delay = process.env.SLEEP || 3600

async function run() {
    console.log('Checking mail every '+delay+' seconds')
    while ( true ) {
        sber.checkMail({
            mail: {
                user: process.env.IMAP_USER, 
                password: process.env.IMAP_PASSWORD, 
                host: process.env.IMAP_SERVER,
                port: process.env.IMAP_PORT,
                tls: process.env.IMAP_TLS 
            }
        })

        await new Promise(resolve => setTimeout(resolve, delay * 1000 ));
        console.log( 'check')
    }
}

run()