import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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
const overlay = document.getElementById('confirmation_overlay');
const confirmation_button = document.getElementById('confirmationbtn');
const cancel_button = document.getElementById('cancelbtn');
if (seller_form) {
    seller_form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (overlay) overlay.style.display = 'flex';
    });
}
if (cancel_button) {
    cancel_button.addEventListener('click', () => {
        if (overlay) overlay.style.display = 'none';
    });
}
const collection_reference = collection(db, 'request_registration');
if (confirmation_button) {
    confirmation_button.addEventListener('click', async () => {
        const fileInput = document.getElementById('image');
        const file = fileInput ? fileInput.files[0] : null;
        
        if (!file) {
            alert("Please upload a profile image.");
            return;
        }
        confirmation_button.disabled = true;
        confirmation_button.innerText = "Submitting...";
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Image = reader.result;
            try {
                await addDoc(collection_reference, {
                    name: document.getElementById('name').value,
                    phonenumber: document.getElementById('phonenumber').value,
                    email: document.getElementById('email').value,
                    country: document.getElementById('country-list').value,
                    profile_image: base64Image,
                    product_category: document.getElementById('product-category').value,
                    timestamp: new Date()
                });
                alert("Registration request submitted successfully!");
                if (overlay) overlay.style.display = 'none';
                seller_form.reset();
                confirmation_button.disabled = false;
                confirmation_button.innerText = "Confirm";
                
            } catch (error) {
                console.error("Error saving to Firestore:", error);
                alert("Failed to submit. Please try again.");
                confirmation_button.disabled = false;
                confirmation_button.innerText = "Confirm";
            }
        };
        reader.onerror = () => {
            alert("Error reading file.");
            confirmation_button.disabled = false;
            confirmation_button.innerText = "Confirm";
        };
    });
}