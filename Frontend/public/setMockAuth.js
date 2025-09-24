// Simple script to set a mock authentication token for testing
console.log('Setting mock authentication token...');

// Set mock token in localStorage
localStorage.setItem('token', 'mock-token-for-testing');
localStorage.setItem('auth_token', 'mock-token-for-testing');

console.log('Mock token set. Refreshing page...');

// Refresh the page to trigger auth check
window.location.reload();