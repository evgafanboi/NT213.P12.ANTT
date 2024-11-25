async function generateUsername() {
    const { default: generateRandomUsername } = await import('generate-random-username');
    const username = generateRandomUsername({ digits: 6, capitalize: true });
    return username;
}

module.exports = { generateUsername };