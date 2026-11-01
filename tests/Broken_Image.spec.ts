import {test,expect} from "../fixture";
import testData from "../testData/test_data.json";

test.describe('Image Testing',()=> {

test.beforeEach(async({page})=>{
    await expect(page).toHaveTitle(/The Internet/);
    await expect(page.getByRole('link', { name: 'Broken Images',   exact: true  })).toBeVisible();
    await page.getByRole('link', { name: 'Broken Images',   exact: true  }).click();
});

test('verify the broken images',async({page})=>{
    await expect(page.getByText('Broken Images')).toBeVisible();
    const imageElements = await page.locator('img');
    //Verify total images
    await expect(imageElements).toHaveCount(4);
    //   // Check every image

    for (let i =0;i< await imageElements.count();i++) {
        const imageElement = imageElements.nth(i);
        const imageSrc = await imageElement.getAttribute('src');
        const imageResponse = await page.request.get(imageSrc || '');
    }
});

})