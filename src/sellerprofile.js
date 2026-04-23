import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBuh5e6OsM92P7c11XKOKxhZxsLEc0Q8PE",
    authDomain: "zingdb-9653d.firebaseapp.com",
    projectId: "zingdb-9653d",
    storageBucket: "zingdb-9653d.appspot.com", 
    messagingSenderId: "72448395530",
    appId: "1:72448395530:web:dadc8947a300cbea6c12f3",
    measurementId: "G-5D61PS4HN6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const seller_form = document.getElementById('sellerForm');
const reference = collection(db, 'sellers');

seller_form.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const sellerIdInput = document.getElementById('name').value;
    const password = document.getElementById('password').value;

    try {
        // We parse the ID to an integer because it's stored as a number in DB
        const q = query(
            reference,
            where("seller_id", "==", parseInt(sellerIdInput)),
            where("password", "==", password)
        );

        const seller_list = await getDocs(q);

        if (!seller_list.empty) {
            alert("Login successful");
            const seller_data = seller_list.docs[0].data();
            
            // Storing the data in sessionStorage for the next page
            sessionStorage.setItem('currentSeller', JSON.stringify(seller_data));
            window.location.href = 'seller_board.html';
        } else { 
            alert("Invalid Seller ID or password");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login");
    }
});