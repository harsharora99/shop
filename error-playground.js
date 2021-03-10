//we run this file using command node error-playground.js
const sum = (a, b) => {
    if (a && b) {
        return a + b;
    }
    throw new Error('Invalid arguments');
}

try {
    console.log(sum(1));
} catch (e) {
    console.log('Error occured!');
    console.log(e);
}

console.log('This works!');