# NT213.P12.ANTT
### NodeJS based blog website
## Getting Started
To get started with this NodeJS based blog website, follow these simple steps:
1. **Clone the Repository**: Open your terminal and run the following command to clone the project:
   ```sh
   git clone https://github.com/evgafanboi/NT213.P12.ANTT.git
   cd NT213.P12.ANTT
   npm install
   ```
   <br>
2. **Start the Application**: 
   - `.env` initializtion:
   From the root directory (on the same level as README.md), run the following command to initialize the .env file:
   ```sh
   touch .env
   ```
   Then, open the .env file and fill in the following fields:
   ```
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_app_password
   ```
   Also, change the PORTs in the .env file:
   ```
   HTTPS_PORT=<your_desired_port>
   HTTP_PORT=<your_desired_port+1>
   ```
   Generate a random n characters string, using for example:
   ```sh
   openssl rand -base64 n
   ```
   **n** can be an exponent of 2, for example 128, 256, 512, 1024, etc. Recommended value is 256.
   and set it as the value for `SESSION_SECRET` in the .env file:
   ```
   #.env:
   SESSION_SECRET=<your_random_string>
   ```
   - Start the application:

   Run the following command to start the application (at the root directory):
   ```sh
   npm start
   ```

   - **Do not** run the application by `node app.js` as it will ignore the .env file entirely.
   <br>
3. **Access the Application**: 
   Open your web browser and go to `https://localhost:<your_desired_port>`. The default page is the login page as per the logic in `app.js`.
   <br>

4. **SSL/TLS Setup**:
   - Generate or obtain SSL certificates. (via [Let's Encrypt](https://letsencrypt.org/) is recommended)
   - For self-signed certificates, at the root directory (on the same level as README.md):
   ```sh
   mkdir ssl
   openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
   ```
   - Place your private key in `ssl/key.pem` and your certificate in `ssl/cert.pem`. Create `ssl` directory if you have not done so.

   **NOTE**: Using self-signed certificates will make the browser issue a security warning. Ignore anyway. Or get a Let's Encrypt one. It's free and needs 1 line of command.
   - Update the SSL paths in `src/app.js` if necessary.

5. **HTTPS Configuration**:
   - The application now runs on HTTPS by default. However, it also hosts an HTTP server that redirects to HTTPS for every request.
   - Change the `HTTPS_PORT` and `HTTP_PORT` in the .env file to your desired ports. Oddest ports are recommended.

6. **Modify the Code**: 
   Feel free to explore and modify the code to suit your needs. Check the `src` folder for the main application files. Also, check the API documentation in the `docs` folder for more details on how to interact with the application's endpoints.
   <br>
7. **Packages used**:
   The following Node.js modules/packages are utilized in this project. This list will be updated as more packages are added:
   - express, express-session, express-validator, helmet, xss-clean, bcrypt, connect-sqlite3, nodemailer, dotenv

   To install all packages, run the following command:
   ```sh
   npm install express express-session connect-sqlite3 bcrypt express-validator helmet xss-clean nodemailer dotenv generate-random-username express-rate-limit connect-timeout marked highlight.js dompurify isomorphic-dompurify jsdom github-markdown-css ejs csrf-csrf cookie-parser
   ```
   <br>
   
   > If prompted, run `npm audit fix`. Do **not** run `npm audit fix --force` unless it's a high severity vulnerability. Report to repo owner if you are unsure.
   
   <br>
For any issues, please refer to the documentation or open an issue in the repository. 

Happy coding!