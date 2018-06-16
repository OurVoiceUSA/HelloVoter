var http = require("http");

var ip_header = (process.env.CLIENT_IP_HEADER?process.env.CLIENT_IP_HEADER:"x-client-ip");

var options = {  
   host : 'localhost',
   port : '8080',
   path: '/poke',
   timeout : 4500,
   headers: {
     [ip_header]: "127.0.0.1",
   },
};

var request = http.request(options, (res) => {  
  if (res.statusCode == 200) {
    process.exit(0);
  }
  console.log('status code != 200');
  process.exit(1);
});

request.on('error', function(err) {  
    console.log('node.js http error');
    process.exit(1);
});

request.end();  
