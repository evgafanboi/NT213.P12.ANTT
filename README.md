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

   - Start the application:

   Run the following command to start the application:
   ```sh
   npm start
   ```

   - **Do not** run the application with
   ```sh
   node app.js
   ```
   as it will ignore the .env file entirely.
   <br>
3. **Access the Application**: 
   Open your web browser and go to `http://localhost:3000`. The default page is the login page as per the logic in `app.js`.
   <br>

4. **Modify the Code**: 
   Feel free to explore and modify the code to suit your needs. Check the `src` folder for the main application files. Also, check the API documentation in the `docs` folder for more details on how to interact with the application's endpoints.
   <br>
5. **Packages used**:
   The following Node.js modules/packages are utilized in this project. This list will be updated as more packages are added:
   - express, express-session, express-validator, helmet, xss-clean, bcrypt, connect-sqlite3, nodemailer, dotenv

   To install all packages, run the following command:
   ```sh
   npm install express express-session connect-sqlite3 bcrypt express-validator helmet xss-clean nodemailer dotenv
   ```
   <br>
For any issues, please refer to the documentation or open an issue in the repository. 

Happy coding!
