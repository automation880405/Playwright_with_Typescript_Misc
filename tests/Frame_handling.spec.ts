import{test,expect} from "../fixture";
import testData from "../testData/test_data.json";

test.describe('Frame Handling',()=>{


test.beforeEach(async({page})=>{
    await expect(page).toHaveTitle(/The Internet/);
await expect(page.getByRole('link', { name: 'Frames',   exact: true  })).toBeVisible();
    await page.getByRole('link', { name: 'Frames',   exact: true  }).click();

})




test('verify the singleframes',async({page})=>{
    

    await expect(page.getByText('Nested Frames')).toBeVisible();
   
    await expect(page.getByText('iFrame',{exact:true})).toBeVisible();
    await page.getByText('iFrame',{exact:true}).click();
    //verify An iFrame containing the TinyMCE WYSIWYG Editor
    
    await expect(page.getByText('TinyMCE')).toBeVisible();
    //enter the text in the frame id-; tinymce
    const frameLocator = page.frameLocator('#mce_0_ifr');
    await frameLocator.locator('#tinymce').fill(testData.input_frame);
    const frame = await page.frames().find(f => f.url() === "about:srcdoc")
    if (frame) {
    console.log(frame.name(),frame.url());

    }

//get all the frames in the page
const frameContent = await page.frames();
 if (frameContent) {
    for(const f of frameContent){
    console.log(f.name(),f.url());
          await test.info().attach('Frame Details', {
            body: `Frame Name: ${f.name()}\nFrame URL: ${f.url()}`,
            contentType: 'text/plain'
        });

    }
 }


})

test('nestedframes',async({page})=>{
    await expect(page.getByText('Nested Frames')).toBeVisible();
    await page.getByText('Nested Frames').click();
    //Verify the Nested Frames page loads
    await expect(page).toHaveURL(/nested_frames$/);///nested_frames$/ is a regular expression.$ means the URL must end with nested_frames.
    //get all the frames in the page
    
    const Framenames = await page.frames().map(frame => frame.name());
    console.log(Framenames);
    const frameCount = await page.frames().length;
    console.log(`Total number of frames in the page: ${frameCount}`);
    await test.info().attach('Frame Details', {
        body: `Total number of frames in the page: ${frameCount}\nFrame Names: ${Framenames.join(', ')}`,
        contentType: 'text/plain'

    });

   const framename = await page.frames().map(frame => frame.name());
   const frameurl = await page.frames().map(frame => frame.url());
   console.log(`Frame Names: ${framename}`);
   console.log(`Frame URLs: ${frameurl}`);
   await test.info().attach('Frame Details', {
    body: `Frame Names: ${framename.join(', ')}\nFrame URLs: ${frameurl.join(', ')}`,
    contentType: 'text/plain'
  });
})






});
