// netlify/functions/user.js
// Yeh Express server ki jagah kaam karega — serverless!

const axios = require('axios');

exports.handler = async (event) => {
  // CORS headers — browser ke liye zaroori
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Preflight request handle karo
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // URL se username lo: /.netlify/functions/user?username=cristiano
  const username = event.queryStringParameters?.username?.trim().toLowerCase();

  // Validate karo
  if (!username || !/^[a-z0-9._]{1,30}$/.test(username)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid username.' }),
    };
  }

  try {
    const response = await axios.get(
      `https://www.instagram.com/${username}/?__a=1&__d=dis`,
      {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.instagram.com/',
          'X-IG-App-ID': '936619743392459',
        },
      }
    );

    const data = response.data;

    // Profile pic URL dhundo
    let profilePicUrl =
      data?.graphql?.user?.profile_pic_url_hd ||
      data?.graphql?.user?.profile_pic_url ||
      data?.data?.user?.profile_pic_url_hd ||
      data?.data?.user?.profile_pic_url ||
      null;

    // HTML fallback
    if (!profilePicUrl) {
      const html = String(data);
      const match =
        html.match(/"profile_pic_url_hd":"([^"]+)"/) ||
        html.match(/"profile_pic_url":"([^"]+)"/);
      if (match) {
        profilePicUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      }
    }

    if (!profilePicUrl) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: `@${username} ka profile picture nahi mila. Account private ho sakta hai.`,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, profile: profilePicUrl, username }),
    };

  } catch (err) {
    const status = err.response?.status;

    if (status === 404) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, message: `@${username} account nahi mila.` }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Instagram se fetch nahi ho saka. Thodi der baad try karo.',
      }),
    };
  }
};