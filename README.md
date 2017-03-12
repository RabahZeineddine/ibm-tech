# IBM Tech TV's control app 

This application contolrs IBM's TVs using Bluemix Cloudant NoSQL DB service and node.js.  It helps IBM Tech organize their rooms tv's pictures depending on raspberry's ip. The UI talks to a RESTful Express backend API.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://github.com/RabahZeineddine/ibm-tech)

## Run the app locally

1. [Install Node.js][]
+ cd into this project's root directory
+ Copy the value for the VCAP_SERVICES envirionment variable from the application running in Bluemix and paste it in a `vcap-local.json` file
+ Run `npm install` to install the app's dependencies
+ Run `npm start` to start the app
+ Access the running app in a browser at <http://localhost:6001>

[Install Node.js]: https://nodejs.org/en/download/
