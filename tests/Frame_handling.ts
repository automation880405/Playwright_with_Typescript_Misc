import{test,expect} from "../fixture";
test('verify the frames',async({page})=>{
    await expect(page).toHaveTitle(/The Internet/);
});
