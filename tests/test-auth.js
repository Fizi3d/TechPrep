const url = "http://localhost:3000";
async function testAuth() {
    try {
        const response1 = await fetch(url + "/api/me");

        if (response1.status === 401) {
            console.log("PASS: Login is required to access account");
        } else {
            throw new Error("FAIL: Account was not protected");
        }
        const response2 = await fetch(url + "/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: "invalid@example.invalid",
                password: "wrongpassword"
            })
        });

        if (response2.status === 401) {
            console.log("PASS: Invalid login was rejected");
        } else {
            throw new Error("FAIL: Invalid login was accepted");
        }
        console.log("All authentication tests passed!");
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
testAuth();
