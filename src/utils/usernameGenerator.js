async function generateUsername() {
    const { default: generateRandomUsername } = await import('generate-random-username');
    return generateRandomUsername({ digits: 6, capitalize: true });
}

module.exports = { generateUsername };