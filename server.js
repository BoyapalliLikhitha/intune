import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';


const app = express();


// Your Azure AD configuration

const clientId = 'b87e48d6-2c35-4937-aef2-ff5c3f68b01d';
const clientSecret = 'q_k8Q~CHceybU8IKX4mBD8~giVztSNAWwfZsPbbi';
const tenantId = 'fdc223cd-8687-48e5-b9e8-ad52f8adbdaa';

app.use(cors());

app.use(express.static('public'))


app.get('/getAccessToken', async (req, res) => {
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const tokenRequestParams = new URLSearchParams();
    tokenRequestParams.append('grant_type', 'password');
    tokenRequestParams.append('client_id', clientId);
    tokenRequestParams.append('scope', 'https://graph.microsoft.com/.default');
    tokenRequestParams.append('client_secret', clientSecret);
    tokenRequestParams.append('username', req.query.username);
    tokenRequestParams.append('password', req.query.password);

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            body: tokenRequestParams,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (response.ok) {
            const tokenData = await response.json();
            const accessToken = tokenData.access_token;

            const isUserAdmin = await checkGroupMembership(req.query.username, accessToken);

            if (isUserAdmin) {
                // Retrieve the app access token
                const appAuthToken = await authforApp(clientId, clientSecret, tenantId);

                // Retrieve the recovery key
                const recoveryKey = await authRecoveryKey(clientId, clientSecret, tenantId);

                res.json({
                    access_token: accessToken,
                    isUserAdmin: isUserAdmin,
                    recoveryKey: recoveryKey,
                    authforApp: appAuthToken,
                });
            } else {
                res.status(403).json({ error: 'Access denied. User is not part of the admin group.' });
            }
        } else {
            if (response.status === 400) {
                res.status(401).json({ error: 'Invalid credentials' });
            } else {
                res.status(response.status).json({ error: 'Failed to obtain access token' });
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to obtain access token' });
    }
});

async function checkGroupMembership(username, accessToken) {
    // Define the API endpoint with the user's username
    const url = `https://graph.microsoft.com/v1.0/users/${username}/memberOf`;

    try {
        // Make a GET request to the API with the access token
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();

            // Define the target group name you want to check
            const targetGroupName = "becf745e-2def-4421-ae9f-63adc15a1dd6"; // Replace with the actual group name you want to check

            // Check if the target group is present in the response
            const isGroupPresent = data.value.some(group => group.id === targetGroupName);

            if (isGroupPresent) {
                return true;
            } else {
                return false;
            }
        } else {
            throw new Error(`HTTP Error: ${response.status}`);
        }
    } catch (error) {
        console.error("Error:", error);
        return false;
    }
}

async function authRecoveryKey(clientId, clientSecret, tenantId) {
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    // Define the request body for obtaining a token
    const authRequestBody = {
        grant_type: 'password',
        scope: 'https://graph.microsoft.com/.default',
        client_id: clientId,
        client_secret: clientSecret,
        username: 'nbhurli@stefaninidemo1.onmicrosoft.com',
        password: 'Stefanin!@123'
    };

    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(authRequestBody).toString(), // Ensure the body is URL-encoded
        });

        if (response.ok) {
            const authData = await response.json();

            if (authData.access_token) {
                return authData.access_token;
            } else {
                console.error('Error obtaining auth token:', authData.error_description);
                throw new Error('Error obtaining auth token: No access token found');
            }
        } else {
            console.error('Error obtaining auth token:', response.statusText);
            throw new Error('Error obtaining auth token: Bad response status');
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error obtaining auth token: Network error or other issue');
    }
}

async function authforApp(clientId, clientSecret, tenantId) {
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    // Define the request body for obtaining a token
    const authRequestBody = {
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
        client_id: clientId,
        client_secret: clientSecret,
        tenant: tenantId
    };

    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(authRequestBody).toString(), // Ensure the body is URL-encoded
        });

        if (response.ok) {
            const authData = await response.json();

            if (authData.access_token) {
                return authData.access_token;
            } else {
                console.error('Error obtaining auth token:', authData.error_description);
                throw new Error('Error obtaining auth token: No access token found');
            }
        } else {
            console.error('Error obtaining auth token:', response.statusText);
            throw new Error('Error obtaining auth token: Bad response status');
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error obtaining auth token: Network error or other issue');
    }
}

const PORT = process.env.PORT || 443;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
