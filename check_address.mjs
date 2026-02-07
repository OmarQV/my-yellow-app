import { getAddress } from 'viem';
try {
    const wrong = '0xb1d4538B4571d411F87661b369D590D0579e006E';
    console.log('Original:', wrong);
    console.log('Correct:', getAddress(wrong));
} catch (e) {
    console.log('Error parsing:', e.message);
    // If strict fails, we might need to try lowercasing first
    console.log('Trying lowercase input...');
    console.log('Correct from lower:', getAddress('0xb1d4538b4571d411f87661b369d590d0579e006e'));
}
