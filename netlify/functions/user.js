const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const username = event.queryStringParameters?.username?.trim().toLowerCase();

  if (!username || !/^[a-z0-9._]{1,30}$/.test(username)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid username.' }),
    };
  }

  try {
    // Instagram profile page se og:image nikaalenge
    const response = await axios.get(
      `https://www.instagram.com/${username}/`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'Accept': 'text/html',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    const html = response.data;

    // og:image meta tag se URL nikalo
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);

    if (!match) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: `@${username} ka profile picture nahi mila. Account private ho sakta hai.`,
        }),
      };
    }

    const profilePicUrl = match[1];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        profile: profilePicUrl,
        username,
      }),
    };

  } catch (err) {
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
