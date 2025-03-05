// Initialize Appwrite client
const client = new Appwrite.Client();
client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('67c62b88002f2e0fe5b3');

const account = new Appwrite.Account(client);

async function createAccount(username, password) {
    try {
        const user = await account.create('unique()', username, password);
        await account.createEmailSession(username, password);
        window.location.href = 'http://localhost:5000/dashboard.html';
    } catch (error) {
        throw new Error(error.message);
    }
}

async function loginWithProvider(provider) {
    try {
        await account.createOAuth2Session(provider, 'http://localhost:5000/dashboard.html');
    } catch (error) {
        throw new Error(error.message);
    }
}

async function loginWithGoogle() {
    try {
        await account.createOAuth2Session('google', 'http://localhost:5000/dashboard.html');
    } catch (error) {
        throw new Error(error.message);
    }
}

async function checkAuthStatus() {
    try {
        const user = await account.get();
        return user;
    } catch (error) {
        return null;
    }
}

async function logout() {
    try {
        await account.deleteSession('current');
        window.location.href = 'http://localhost:5000/login.html';
    } catch (error) {
        throw new Error(error.message);
    }
}

window.createAccount = createAccount;
window.loginWithProvider = loginWithProvider;
window.loginWithGoogle = loginWithGoogle;
window.checkAuthStatus = checkAuthStatus;
window.logout = logout;
