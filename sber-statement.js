// download sber statement
'use strict'
const fs = require('fs')  
const Path = require('path')  
const Axios = require('axios')
const Imap = require('imap')

const downloaded = {

}

// Скачиваем файл
async function downloadFile ( url ) {

    var id = url.replace(/.*\/download\//g,'')
    if ( downloaded[id] ) {
        // console.log('Already DOWNLOADED!')
        return;
    }
    console.log( 'Downloading ', url )
    downloaded[id] = true
    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })
    var regexp = /filename=\"(.*)\"/gi;
    var filename = decodeURI(regexp.exec( response.headers['content-disposition'] )[1])
    const d = new Date( response.headers['last-modified'] )
    const date = d.toISOString().split('T')[0].replace(/-/g,'')
    const etag = response.headers['etag'] 

    const path = Path.resolve(__dirname, 'statements', date+'-'+filename )
    const writer = fs.createWriteStream(path)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

function processMessages( imap, f )
{

    f.once('error', function(err) {
        console.log('Fetch error: ' + err);
    });
    f.once('end', function() {
        console.log('Done fetching all messages!');
        imap.end();
    });

    f.on('message', function(msg, seqno) {
        console.log('Message #%d', seqno);
        var prefix = '(#' + seqno + ') ';

        msg.on('body', function(stream, info) {
            var buffer = '';
            stream.on('data', function(chunk) {
                buffer += chunk.toString('utf8');
            });
            stream.once('end', async function() {
                if (info.which === 'TEXT') {
                    const text = buffer.replace(/=\r\n/g, '')
                    var regexp = /<a href=3D\"(.*)\" style/gi;
                    const exp = regexp.exec( text )
                    if ( exp ) {
                        if ( exp.length == 2 ) {
                            const fileUrl = exp[1]
                            const site = fileUrl.replace(/:9443\/sbns-app\/download\/.*/,'')
                            if ( site === 'https://bf.sberbank.ru' ){ 
                                try {
                                    await downloadFile( fileUrl )
                                } catch (err) {

                                }  
                            }
                        }
                    }
                }
            });
        });

        msg.once('attributes', function(attrs) {
            // console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
        });

        msg.once('end', function() {
            // console.log(prefix + 'Finished');
        });
    });
}

// Get Sber statement mail
const checkMail = async function( config ){

    var imap = new Imap( config.mail );
    
    function openInbox(cb) {
        imap.openBox('INBOX', true, cb);
    }
    
    imap.once('error', function(err) {
        console.log(err);
    });
      
    imap.once('end', function() {
        console.log('Connection ended');
    });
    
    imap.once('ready', function() {
        openInbox( function(err, box) {
            if (err) throw err;
            const days = 1
            const d = new Date( Date.now() - days*24*60*60*1000 )
            imap.search([ ['HEADER', 'FROM', 'sbbol@sberbank.ru'],['SINCE', d.toUTCString()]], function(err, results) {                
                if (err) throw err;
                var f = imap.fetch(results,{
                    bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)','TEXT'],
                    struct: true
                });
                processMessages( imap, f )
            })
        });
    });

    await imap.connect();
}

module.exports = {
    checkMail
}
