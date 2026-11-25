import type {
  ActivityCancellationPolicy,
  ActivityGoodToKnowItem,
  ActivityHowToUse,
  ActivityItineraryStep,
  TransferService,
  TravelActivity,
} from "@luxestay/contracts";
import type { SeedTransferServiceBase, SeedTravelActivityBase } from "./types.js";

/**
 * Hand-crafted 3-angle gallery captions for all 56 Vietnam activities.
 * Index 0 matches cover `/images/activities/act-XX.jpg`,
 * Index 1 matches `/images/activities/act-XX-2.jpg`,
 * Index 2 matches `/images/activities/act-XX-3.jpg`.
 */
const ACTIVITY_IMAGE_CAPTIONS: Record<string, readonly [string, string, string]> = {
  "act-01": [
    "Xe SUV 7 chỗ riêng đón tận cửa sân bay Liên Khương đi Đà Lạt",
    "Cung đường đèo rừng thông xanh mát từ sân bay vào trung tâm Đà Lạt",
    "Không gian hồ Xuân Hương & thành phố sương mù điểm trả tận chỗ nghỉ",
  ],
  "act-02": [
    "Xe VIP 7 chỗ đời mới đưa đón thẳng từ sân bay Phú Quốc về resort",
    "Sảnh ga đến sân bay quốc tế Phú Quốc & đường rợp bóng dừa",
    "Bờ biển Dương Đông – Bãi Trường nơi kết nối trực tiếp các villa nghỉ dưỡng",
  ],
  "act-03": [
    "Xe riêng đời mới kết nối sân bay Đà Nẵng đi biển Mỹ Khê & Hội An",
    "Dải biển Mỹ Khê & cung đường ven biển Võ Nguyên Giáp thơ mộng",
    "Phố cổ Hội An sắc vàng trầm ấm — điểm trả tận cửa villa & homestay",
  ],
  "act-04": [
    "Khoang Limousine VIP 9 ghế thương gia tuyến Hà Nội ↔ Sa Pa",
    "Trung tâm thị trấn Sa Pa & Nhà thờ Đá điểm đón trả tận khách sạn",
    "Cung đường mây núi Tây Bắc và đèo Ô Quy Hồ hùng vĩ trên hành trình",
  ],
  "act-05": [
    "Biển mây bình minh lãng mạn trên đồi chè Cầu Đất Đà Lạt",
    "Những luống chè xanh trải dài đón nắng sớm trên cao nguyên Lâm Đồng",
    "Thưởng thức cà phê Arabica rang xay nóng hổi giữa rừng thông se lạnh",
  ],
  "act-06": [
    "Cano cao tốc lướt sóng khám phá 4 đảo đẹp nhất Nam Phú Quốc",
    "Bãi cát trắng mịn và làn nước ngọc bích tại Hòn Móng Tay – An Thới",
    "Tiệc trưa hải sản tươi sống ngay trên nhà hàng nổi ven đảo",
  ],
  "act-07": [
    "Xuôi thuyền nan qua thung lũng núi đá vôi Di sản Tràng An Ninh Bình",
    "Toàn cảnh sông nước & đỉnh Ngọa Long Hang Múa nhìn từ trên cao",
    "Cánh đồng lúa xanh rì bao quanh di tích Cố đô Hoa Lư thanh bình",
  ],
  "act-08": [
    "Du thuyền 5 sao lướt giữa hàng nghìn đảo đá vôi Vịnh Hạ Long",
    "Trải nghiệm tự tay chèo Kayak xuyên vòm núi đá Hang Luồn tĩnh lặng",
    "Hoàng hôn rực rỡ trên boong sundeck giữa kỳ quan thiên nhiên thế giới",
  ],
  "act-09": [
    "Nghệ nhân hướng dẫn tự tay làm đèn lồng lụa khung tre Hội An",
    "Phố cổ Hội An rực rỡ sắc đèn lồng truyền thống khi phố lên đèn",
    "Thả hoa đăng lung linh cầu bình an trên dòng sông Hoài về đêm",
  ],
  "act-10": [
    "Ngâm bồn gỗ Pơ-mu nước lá thuốc 39 vị thảo mộc người Dao Đỏ Sa Pa",
    "Không gian thảo dược tự nhiên ấm cúng & trà gừng mật ong rừng",
    "Liệu trình massage chân bấm huyệt phục hồi sau ngày dài trekking",
  ],
  "act-11": [
    "Tự tay chế biến tinh hoa ẩm thực cung đình trong nhà vườn xứ Huế",
    "Dạo chợ Đông Ba chọn thảo mộc và nguyên liệu tươi chuẩn vị Cố đô",
    "Thưởng thức Bún Bò Huế, Bánh Khoái & món ngon do chính bạn nấu",
  ],
  "act-12": [
    "Biển Kỳ Co trong vắt nhìn thấu đáy với rạn san hô Bãi Dứa Quy Nhơn",
    "Cung đường đi bộ ven vách đá Eo Gió ôm trọn vịnh biển Bình Định",
    "Lặn ống thở ngắm san hô tự nhiên và thưởng thức hải sản làng chài Nhơn Lý",
  ],
  "act-13": [
    "Check-in Cầu Vàng nổi tiếng thế giới giữa biển mây Sun World Bà Nà Hills",
    "Quần thể Làng Pháp cổ kính & tuyến cáp treo kỷ lục giữa đại ngàn",
    "Kiến trúc lâu đài châu Âu lãng mạn trong sương sớm đỉnh Bà Nà",
  ],
  "act-14": [
    "Cổng lâu đài cổ tích tại công viên chủ đề VinWonders Phú Quốc",
    "Trải nghiệm thế giới đại dương và trò chơi cảm giác mạnh đẳng cấp",
    "Khu bảo tồn động vật bán hoang dã Vinpearl Safari Phú Quốc",
  ],
  "act-15": [
    "Cáp treo 3 dây hiện đại đưa bạn lướt qua mây ngàn Hoàng Liên Sơn",
    "Quần thể tâm linh hùng vĩ và cột mốc Nóc nhà Đông Dương 3.143m",
    "Toàn cảnh dãy núi Hoàng Liên Sơn và thung lũng Mường Hoa trong nắng sớm",
  ],
  "act-16": [
    "Cáp treo vượt biển Hòn Tre nối đất liền tới VinWonders Nha Trang",
    "Toàn cảnh vịnh biển Nha Trang xanh ngắt từ độ cao hàng chục mét",
    "Vòng quay bầu trời, công viên nước và lễ hội ánh sáng về đêm trên đảo",
  ],
  "act-17": [
    "Cổng Ngọ Môn uy nghi dẫn vào Hoàng thành Đại Nội Huế Di sản UNESCO",
    "Kiến trúc cung điện sơn son thếp vàng tại Điện Thái Hòa & Lăng Khải Định",
    "Không gian hồ nước tĩnh tại và hành lang cổ kính của các Lăng Triều Nguyễn",
  ],
  "act-18": [
    "Khuê Văn Các — biểu tượng ngàn năm văn hiến tại Văn Miếu Quốc Tử Giám",
    "Quần thể sân gạch cổ, bia Tiến sĩ và dấu ấn Hoàng Thành Thăng Long",
    "Nghệ thuật thư pháp truyền thống & không gian ánh sáng tour đêm di sản",
  ],
  "act-19": [
    "Cáp treo Hồ Mây lướt từ Bãi Trước lên đỉnh Núi Lớn Vũng Tàu",
    "Góc nhìn bao quát bờ biển Vũng Tàu, Bãi Trước và ngọn Hải Đăng",
    "Hoàng hôn rực rỡ trên vịnh biển nhìn từ đỉnh công viên Hồ Mây",
  ],
  "act-20": [
    "Dinh Độc Lập — công trình kiến trúc lịch sử biểu tượng trung tâm Quận 1",
    "Hành trình qua Nhà thờ Đức Bà & Bưu điện Trung tâm Sài Gòn cổ điển",
    "Xe bus 2 tầng mui trần ngắm nhịp sống Sài Gòn từ bình minh tới khi lên đèn",
  ],
  "act-21": [
    "Xuôi xuồng ba lá len lỏi rạch dừa nước xanh mát miệt vườn Cửu Long",
    "Khám phá mạng lưới Địa đạo Củ Chi lịch sử ẩn dưới tán rừng nhiệt đới",
    "Thưởng thức trái cây miệt vườn tươi ngọt và giao lưu Đờn ca Tài tử",
  ],
  "act-22": [
    "Cano cao tốc khám phá 3 đảo đẹp nhất và biển xanh vịnh Nha Trang",
    "Lặn ngắm rạn san hô đa sắc màu tại Khu bảo tồn biển Hòn Mun",
    "Bãi Tranh nước trong vắt và bữa trưa hải sản tươi tại Làng Chài",
  ],
  "act-23": [
    "Cầu Kính Bạch Long kỷ lục thế giới giữa núi non hùng vĩ Mộc Châu",
    "Đồi chè Trái tim xanh mướt và thác Dải Yếm trắng xóa giữa cao nguyên",
    "Sắc hoa cao nguyên và bản làng người Thái bình yên xứ Sơn La",
  ],
  "act-24": [
    "Vi vu xe Jeep cổ điển xuyên 36 phố phường và ngõ nhỏ Phố cổ Hà Nội",
    "Dừng chân tại Cầu Long Biên lịch sử & Phố Đường Tàu nổi tiếng",
    "Thưởng thức Bún Chả, Cà phê Trứng trứ danh và hoàng hôn Hồ Tây",
  ],
  "act-25": [
    "Đạp xe giữa đồng lúa vàng và đi đò 3 hang dọc sông Ngô Đồng Tam Cốc",
    "Chùa Bích Động cổ kính tựa vách núi đá vôi non nước Ninh Bình",
    "Đầm sen & khung cảnh chim trời bay về tổ tại Vườn chim Thung Nham",
  ],
  "act-26": [
    "Chèo thuyền thúng len lỏi giữa Rừng Dừa Bảy Mẫu Cẩm Thanh Hội An",
    "Trải nghiệm múa thúng chai sôi động và thăm làng rau hữu cơ Trà Quế",
    "Thưởng thức bánh xèo giòn rụm & Cao Lầu chuẩn vị giữa đồng xanh",
  ],
  "act-27": [
    "Máng trượt Alpine Coaster xuyên rừng thông tới chân Thác Datanla",
    "Dòng thác Datanla tung bọt trắng xóa và góc nhìn từ đỉnh núi Langbiang",
    "Thiền viện Trúc Lâm & hồ Tuyền Lâm tĩnh lặng giữa rừng thông Đà Lạt",
  ],
  "act-28": [
    "Xe riêng đời mới đón bảng tên tận cửa ga T1/T2 Sân bay Nội Bài (HAN)",
    "Cầu Nhật Tân rực sáng nối thẳng sân bay về trung tâm Hoàn Kiếm – Hồ Tây",
    "Kiến trúc cổ điển Nhà Hát Lớn & khu Phố cổ Hà Nội điểm trả tận khách sạn",
  ],
  "act-29": [
    "Xe riêng đón làn ưu tiên Sân bay Tân Sơn Nhất (SGN) tránh chờ đợi",
    "Đưa đón thẳng về Phố đi bộ Nguyễn Huệ Quận 1 & khu Thảo Điền",
    "Toàn cảnh thành phố hiện đại bên sông Sài Gòn về đêm",
  ],
  "act-30": [
    "Xe SUV/MPV riêng đón tận cửa ga Sân bay Quốc tế Cam Ranh (CXR)",
    "Cung đường biển tuyệt đẹp dọc đèo Cù Hin và Bãi Dài Cam Ranh",
    "Bờ biển đường Trần Phú rợp hàng dừa — điểm trả tận resort Nha Trang",
  ],
  "act-31": [
    "Cài đặt eSIM Việt Nam 4G/5G tức thì bằng mã QR gửi ngay qua Email",
    "Kết nối bản đồ, gọi xe & đặt vé mượt mà ngay khi máy bay vừa hạ cánh",
    "Sóng khỏe Viettel/VinaPhone ổn định từ phố thị đến hải đảo & vùng núi",
  ],
  "act-32": [
    "Nhận SIM 4G vật lý chính chủ tại Quầy ga đến Sân bay Tân Sơn Nhất 24/7",
    "Nhân viên lắp đặt & kích hoạt trực tiếp tại sảnh ga quốc tế SGN",
    "Kết nối data tốc độ cao & số điện thoại nội địa tiện di chuyển Sài Gòn",
  ],
  "act-33": [
    "Nhân viên VIP Fast-Track đón tận cửa ga đi làn ưu tiên không xếp hàng",
    "Không gian Phòng chờ Thương gia sang trọng với ghế thư giãn & buffet nóng",
    "Khung cảnh cửa khởi hành quốc tế thoải mái trước mọi chuyến bay",
  ],
  "act-34": [
    "Sân khấu thực cảnh 25.000m² hoành tráng của Show Ký Ức Hội An",
    "500 diễn viên áo dài tái hiện 400 năm thương cảng Faifo bằng ánh sáng",
    "Công viên Ấn Tượng Hội An & sông Hoài lung linh rực rỡ về đêm",
  ],
  "act-35": [
    "Nghệ nhân điều khiển rối nước sống động trên sân khấu thủy đình Thăng Long",
    "Dàn nhạc cụ truyền thống Bắc Bộ biểu diễn trực tiếp suốt 50 phút",
    "Hồ Hoàn Kiếm & Tháp Rùa lung linh ngay trước cửa nhà hát về đêm",
  ],
  "act-36": [
    "Siêu show đa phương tiện Kiss of the Sea kết hợp nước, lửa và ánh sáng",
    "Màn pháo hoa tầm cao rực rỡ thắp sáng bầu trời Thị trấn Hoàng Hôn",
    "Cầu Hôn (Kiss Bridge) và kiến trúc Địa Trung Hải Nam đảo Phú Quốc",
  ],
  "act-37": [
    "Ngâm bùn khoáng nóng tự nhiên tại I-Resort Nha Trang giữa vườn dừa xanh",
    "Hệ thống hồ bơi khoáng nóng và thác nước thư giãn ngoài trời",
    "Không gian jacuzzi & chòi nghỉ dưỡng thanh mát bên dòng sông Cái",
  ],
  "act-38": [
    "Du thuyền 5 sao lướt êm trên sông Sài Gòn giữa ánh đèn trung tâm Quận 1",
    "Tầm nhìn trọn vẹn Landmark 81 & Cầu Ba Son phản chiếu mặt nước đêm",
    "Tiệc tối sang trọng với nến, rượu vang và nhạc sống Acoustic lãng mạn",
  ],
  "act-39": [
    "Toàn cảnh Bãi Cháy & tuyến Cáp treo Nữ Hoàng vượt vịnh Sun World Hạ Long",
    "Vòng quay Mặt Trời Sun Wheel và khu vườn Nhật trên đỉnh đồi Ba Đèo",
    "Khu trò chơi cảm giác mạnh Dragon Park & Công viên nước sôi động",
  ],
  "act-40": [
    "Cầu Bãi Cháy & cao tốc hiện đại nối thẳng Hà Nội tới vịnh Hạ Long",
    "Cảng tàu khách Quốc tế Hạ Long — điểm trả sát giờ khởi hành du thuyền",
    "Bờ biển Bãi Cháy xanh trong và hành trình Limousine VIP 9 ghế êm ái",
  ],
  "act-41": [
    "Tháp Đôi Chăm Pa cổ kính thế kỷ XII ngay trung tâm thành phố Quy Nhơn",
    "Vườn thú bán hoang dã FLC Zoo Safari Park Nhơn Lý gần gũi thiên nhiên",
    "Bãi đá Ghềnh Ráng Tiên Sa & vịnh biển Quy Nhơn xanh ngắt",
  ],
  "act-42": [
    "Cung đường ven biển tuyệt đẹp nối sân bay Phù Cát về trung tâm Quy Nhơn",
    "Dải bờ biển cát vàng rợp dừa xanh tại khu nghỉ dưỡng Bình Định",
    "Cầu Thị Nại vượt đầm nối thẳng ra bán đảo Phương Mai & Nhơn Lý",
  ],
  "act-43": [
    "Thung lũng cao nguyên Mộc Châu xanh mát và Rừng Thông Bản Áng",
    "Trải nghiệm tự tay hái dâu tây chín đỏ mọng tại nông trại hữu cơ",
    "Khung cảnh làng nguyên thủy Hang Táu yên bình ẩn mình trong sương sớm",
  ],
  "act-44": [
    "Cung đường đèo núi Tây Bắc ngoạn mục từ Hà Nội lên cao nguyên Sơn La",
    "Điểm dừng chân ngắm mây trên đèo Đá Trắng Thung Khe giữa hành trình",
    "Homestay gỗ ấm cúng và đồi chè xanh ngắt điểm trả tận nơi Mộc Châu",
  ],
  "act-45": [
    "Hệ thống hồ khoáng nóng tự nhiên bốc khói tại Minera Hot Springs Bình Châu",
    "Khu tắm Onsen kiểu Nhật & lối đi gỗ xuyên rừng nguyên sinh thanh mát",
    "Hồ ngâm khoáng thư giãn giữa thiên nhiên xanh rì Bà Rịa – Vũng Tàu",
  ],
  "act-46": [
    "Bãi Sau Thùy Vân dài cong vút — điểm đón trả tận khách sạn Vũng Tàu",
    "Đường biển Long Hải – Vũng Tàu thoáng rộng sau 2 giờ đi cao tốc",
    "Mũi Nghinh Phong và bờ biển sóng vỗ rì rào dưới nắng chiều",
  ],
  "act-47": [
    "Du thuyền Rồng trên sông Hương rực sáng dưới ánh hoàng hôn Cố đô Huế",
    "Nghệ sĩ áo dài trình diễn nhã nhạc & Ca Huế Di sản Phi vật thể",
    "Khoảnh khắc thả đèn hoa đăng lung linh xuôi theo dòng Hương Giang",
  ],
  "act-48": [
    "Toàn cảnh quần thể Chùa Bái Đính uy nghiêm giữa núi non Gia Viễn",
    "Hành lang tượng La Hán kỷ lục và Bảo tháp Xá Lợi 13 tầng sừng sững",
    "Cánh rừng mưa nhiệt đới nguyên sinh tại Vườn Quốc gia Cúc Phương",
  ],
  "act-49": [
    "Công viên Suối khoáng nóng Núi Thần Tài ẩn giữa rừng xanh Bà Nà Đà Nẵng",
    "Tháp tắm Onsen Nhật Bản bốc khói ấm nóng và khu dòng sông lười",
    "Hồ khoáng ngoài trời view núi rừng giúp phục hồi năng lượng trọn ngày",
  ],
  "act-50": [
    "Khoảnh khắc Cầu Rồng Đà Nẵng phun lửa rực sáng bầu trời sông Hàn",
    "Toàn cảnh Cầu Quay Sông Hàn & bờ sông lung linh ánh đèn về đêm",
    "Trải nghiệm thư giãn trên boong du thuyền 2 tầng đón gió mát giữa sông",
  ],
  "act-51": [
    "Cano cao tốc tiến vào đảo xanh Cù Lao Chàm nước trong màu ngọc bích",
    "Bãi Chồng cát trắng mịn và đội thuyền gỗ neo đậu thanh bình trên đảo",
    "Thế giới san hô đa sắc tại Bãi Xếp và tiệc hải sản tươi ngon bên biển",
  ],
  "act-52": [
    "Ruộng bậc thang trùng điệp bản Cát Cát – Lao Chải mùa xanh lúa mới",
    "Cầu mây bắc qua suối Mường Hoa dẫn vào bản Tả Van yên bình",
    "Hành trình trekking xuyên bản làng và bữa trưa ấm cúng nhà sàn người Giáy",
  ],
  "act-53": [
    "Làng nghề gốm cổ Bát Tràng 700 năm tuổi bên bờ sông Hồng Hà Nội",
    "Tự tay chuốt đất sét trên bàn xoay thủ công cùng nghệ nhân làng nghề",
    "Khu trưng bày gốm men lam tinh xảo và chợ gốm truyền thống sầm uất",
  ],
  "act-54": [
    "Bộ phát Pocket WiFi 4G nhỏ gọn kết nối đồng thời 5–8 thiết bị du lịch",
    "Nhóm bạn & gia đình chia sẻ mạng 4G tốc độ cao không tốn pin điện thoại",
    "Kết nối xuyên suốt từ quán cà phê Phố cổ đến mọi sân bay Việt Nam",
  ],
  "act-55": [
    "Nhà Hát Lớn Thành Phố (Saigon Opera House) biểu tượng kiến trúc Quận 1",
    "Sân khấu xiếc tre đương đại À Ố Show mãn nhãn ánh sáng & âm thanh",
    "Nghệ sĩ trình diễn kết hợp tre nứa, thúng chai và nhạc cụ dân tộc sống",
  ],
  "act-56": [
    "Không khí ẩm thực đêm sôi động trong những con hẻm đặc trưng Sài Gòn",
    "Thưởng thức Bánh Mì giòn, Bánh Xèo vàng rụm và đồ nướng nóng hổi",
    "Trải nghiệm ngồi sau xe máy bản địa lướt qua phố đêm và chợ hoa rực rỡ",
  ],
};

function buildItinerary(act: SeedTravelActivityBase): ActivityItineraryStep[] {
  if (act.transferDetails) {
    return [
      {
        timeOrStep: "Trước 6 giờ",
        title: "Xác nhận thông tin tài xế & biển số xe",
        description: `Hệ thống gửi tên tài xế, biển số ${act.transferDetails.vehicleType} và số Zalo/điện thoại liên hệ trước giờ đón ít nhất 6 tiếng.`,
      },
      {
        timeOrStep: "Đón khách",
        title: `Đón bảng tên tại ${act.transferDetails.routeFrom}`,
        description:
          "Tài xế theo dõi giờ hạ cánh thực tế (miễn phí chờ 60 phút nếu chuyến bay delay) và hỗ trợ xếp hành lý lên xe.",
      },
      {
        timeOrStep: act.durationLabel,
        title: `Di chuyển êm ái đến ${act.transferDetails.routeTo}`,
        description:
          "Xe chạy thẳng tuyến không ghép khách lẻ, trả tận sảnh khách sạn/villa hoặc điểm hẹn đã đăng ký.",
      },
    ];
  }

  if (act.essentialDetails) {
    return [
      {
        timeOrStep: "Bước 1",
        title: "Xác nhận tức thì & nhận mã dịch vụ",
        description: act.essentialDetails.deliveryMethod,
      },
      {
        timeOrStep: "Bước 2",
        title: "Kích hoạt / Nhận thiết bị nhanh chóng",
        description: act.essentialDetails.activationNote,
      },
      {
        timeOrStep: "Bước 3",
        title: "Sử dụng xuyên suốt hành trình",
        description: `${act.essentialDetails.validityWindow}. Đội ngũ chăm sóc khách hàng LuxeStay trực hỗ trợ 24/7 qua Zalo & Hotline.`,
      },
    ];
  }

  if (act.attractionDetails) {
    return [
      {
        timeOrStep: "Bước 1",
        title: "Nhận vé QR điện tử trong 60 giây",
        description:
          "Ngay sau khi xác nhận đơn, mã QR hợp lệ được gửi về Email và lưu trực tiếp trong mục Tra cứu đơn (/bookings).",
      },
      {
        timeOrStep: "Bước 2",
        title: `Check-in trực tiếp tại ${act.destinationCity}`,
        description: `${act.attractionDetails.entryMethod}. Địa chỉ: ${act.attractionDetails.venueAddress}.`,
      },
      {
        timeOrStep: act.durationLabel,
        title: "Trải nghiệm trọn vẹn các phân khu & show diễn",
        description: `Giờ hoạt động: ${act.attractionDetails.openingHours}. ${act.highlights[0] ?? ""}`,
      },
    ];
  }

  // Tours, Wellness & Dining Cruises
  const primarySlot = act.slots[0];
  const startLabel = primarySlot?.startTime ?? "08:00";
  const endLabel = primarySlot?.endTime ?? "Kết thúc";

  return [
    {
      timeOrStep: startLabel,
      title: "Đón khách & khởi hành",
      description: `Tập trung / đón khách tại ${act.meetingPoint}. Hướng dẫn viên kiểm tra danh sách và phổ biến lịch trình an toàn.`,
    },
    {
      timeOrStep: "Chặng chính",
      title: `Khám phá điểm nhấn tại ${act.destinationCity}`,
      description: `${act.highlights[0]}${act.highlights[1] ? `. ${act.highlights[1]}` : ""}`,
    },
    {
      timeOrStep: "Trải nghiệm thêm",
      title: "Ẩm thực, thư giãn & lưu giữ khoảnh khắc",
      description:
        act.highlights[2] ??
        `Tận hưởng trọn vẹn dịch vụ đã bao gồm trong gói tại ${act.destinationCity}.`,
    },
    {
      timeOrStep: endLabel,
      title: "Kết thúc hành trình & đưa về điểm đón",
      description: `Kết thúc trải nghiệm (${act.durationLabel}), đưa khách trở về điểm đón ban đầu an toàn và hẹn gặp lại.`,
    },
  ];
}

function buildExcluded(act: SeedTravelActivityBase): string[] {
  if (act.transferDetails) {
    return [
      "Phụ thu đón/trả ngoài khu vực trung tâm tiêu chuẩn hoặc dừng thêm điểm ngoài lộ trình",
      "Chi phí ghế trẻ em bổ sung thứ 2 trở đi và tiền thưởng (tip) tự nguyện cho tài xế",
      "Phụ thu giờ chờ phát sinh quá 60 phút sau khi chuyến bay đã hạ cánh",
    ];
  }
  if (act.essentialDetails) {
    return [
      "Chi phí cước gọi/tin nhắn quốc tế ngoài gói dữ liệu đã chọn",
      "Phí bồi hoàn nếu làm mất hoặc hư hỏng thiết bị vật lý (áp dụng riêng cho Pocket WiFi)",
      "Các chi phí cá nhân khác tại sân bay ngoài hạng mục ghi trong gói",
    ];
  }
  if (act.hubSection === "attractions") {
    return [
      "Xe đưa đón hai chiều từ khách sạn tới điểm tham quan (trừ các gói có ghi rõ kèm xe)",
      "Chi phí ăn uống, mua sắm quà lưu niệm và trò chơi có thu phí riêng (như gắp thú, chụp ảnh in)",
      "Chi phí tủ khóa hành lý cá nhân cỡ lớn và bảo hiểm du lịch ngoài khu du lịch",
    ];
  }
  if (act.subcategory === "spa-wellness") {
    return [
      "Xe đưa đón ngoài khu vực trung tâm (trừ gói đã nêu bao gồm xe)",
      "Các liệu trình massage/trị liệu nâng cao gọi thêm tại quầy & đồ uống có cồn",
      "Chi phí cá nhân và tiền tip tự nguyện cho kỹ thuật viên",
    ];
  }
  if (act.subcategory === "live-show") {
    return [
      "Xe đưa đón khách sạn đến nhà hát / sân khấu",
      "Đồ ăn, thức uống gọi thêm ngoài thực đơn tặng kèm & quà lưu niệm",
      "Chi phí nâng hạng ghế phát sinh tại quầy vào ngày biểu diễn",
    ];
  }
  return [
    "Đồ uống gọi thêm ngoài thực đơn bữa ăn tiêu chuẩn (bia, rượu, nước ép riêng)",
    "Chi phí cá nhân, mua sắm đặc sản & tiền thưởng (tip) tự nguyện cho hướng dẫn viên/tài xế",
    "Phụ thu đón trả tại các resort nằm quá xa khu vực trung tâm ngoài tuyến cố định",
  ];
}

function buildKnowBeforeYouGo(act: SeedTravelActivityBase): ActivityGoodToKnowItem[] {
  const city = act.destinationCity;
  const isHighland = ["Đà Lạt", "Sa Pa", "Mộc Châu"].includes(city);
  const isIslandSea =
    act.subcategory === "island-sea" ||
    ["Phú Quốc", "Nha Trang", "Quy Nhơn", "Hạ Long", "Vũng Tàu"].includes(city);

  if (act.transferDetails) {
    return [
      {
        category: "policy",
        title: "Cung cấp đúng số hiệu chuyến bay",
        detail:
          "Vui lòng điền số hiệu chuyến bay & giờ hạ cánh dự kiến ở ô Ghi chú để tài xế tự động cập nhật nếu máy bay đổi giờ.",
      },
      {
        category: "bring",
        title: "Giới hạn hành lý tiêu chuẩn",
        detail: `Xe chứa tối đa ${act.transferDetails.maxPassengers} khách và ${act.transferDetails.maxLuggage} kiện vali 24 inch. Nếu mang bộ golf hoặc xe đẩy em bé, hãy báo trước 12 giờ.`,
      },
      {
        category: "tip",
        title: "Chính sách chờ miễn phí 60 phút",
        detail:
          "Tài xế chờ miễn phí 60 phút tính từ lúc chuyến bay hạ cánh (hoặc 15 phút với điểm đón khách sạn) và liên hệ qua Zalo/WhatsApp.",
      },
      {
        category: "health-age",
        title: "Ghế an toàn cho trẻ em",
        detail:
          "Miễn phí chuẩn bị 1 ghế ngồi trẻ em nếu yêu cầu trong ghi chú khi đặt trước tối thiểu 24 giờ.",
      },
    ];
  }

  if (act.essentialDetails) {
    return [
      {
        category: "policy",
        title: "Kiểm tra tương thích thiết bị & hồ sơ",
        detail: act.essentialDetails.activationNote,
      },
      {
        category: "tip",
        title: "Thời điểm cài đặt tối ưu",
        detail:
          act.subcategory === "sim-wifi"
            ? "Với eSIM, nên quét mã QR cài sẵn khi có WiFi ổn định ngay trước khi lên máy bay để hạ cánh là có sóng 4G/5G ngay."
            : "Vui lòng giữ điện thoại mở kết nối Zalo/WhatsApp khi máy bay vừa hạ cánh để nhân viên đón đúng cửa ống lồng.",
      },
      {
        category: "bring",
        title: "Giấy tờ đối chiếu tại sân bay",
        detail:
          "Chuẩn bị sẵn mã đơn LuxeStay (ACT-...) trên điện thoại và Hộ chiếu/CCCD bản gốc cho các dịch vụ nhận trực tiếp tại sân bay.",
      },
      {
        category: "weather",
        title: "Hỗ trợ kỹ thuật & đổi chuyến bay 24/7",
        detail:
          "Nếu chuyến bay thay đổi giờ hạ cánh, chỉ cần nhắn mã đơn qua hotline hỗ trợ — dịch vụ tự động cập nhật theo lịch mới không mất phí.",
      },
    ];
  }

  const items: ActivityGoodToKnowItem[] = [];

  if (act.subcategory === "heritage-culture") {
    items.push({
      category: "dress-code",
      title: "Trang phục lịch sự tại di tích & đền chùa",
      detail:
        "Vui lòng mặc áo có tay và quần/váy dài qua đầu gối khi vào các điện thờ, lăng tẩm hoặc chính điện chùa; mang giày bệt dễ di chuyển.",
    });
  } else if (act.subcategory === "spa-wellness") {
    items.push({
      category: "dress-code",
      title: "Đồ bơi & trang phục ngâm khoáng",
      detail:
        "Nên mang sẵn đồ bơi vừa vặn (chất liệu co giãn, không có khóa kim loại sắc) và 1 bộ quần áo khô để thay sau khi tắm bùn/khoáng nóng.",
    });
  } else if (act.subcategory === "live-show") {
    items.push({
      category: "dress-code",
      title: "Trang phục gọn đẹp & quy định quay chụp",
      detail:
        "Trang phục lịch sự thoải mái; vui lòng tắt đèn flash và không livestream trong suốt thời gian nghệ sĩ biểu diễn để đảm bảo trải nghiệm chung.",
    });
  } else if (isHighland) {
    items.push({
      category: "dress-code",
      title: `Giữ ấm & giày bám tốt vùng núi ${city}`,
      detail:
        "Nhiệt độ sáng sớm/chiều tối vùng cao thường 12–18°C và có sương ẩm. Nên mặc áo khoác nhẹ nhiều lớp và đi giày thể thao đế chống trượt.",
    });
  } else if (isIslandSea) {
    items.push({
      category: "bring",
      title: "Đồ bơi, kem chống nắng & túi chống nước",
      detail:
        "Mang theo đồ bơi, khăn tắm cá nhân, kính râm, dép đi biển, kem chống nắng thân thiện rạn san hô và túi chống nước cho điện thoại.",
    });
  } else {
    items.push({
      category: "dress-code",
      title: "Trang phục thoáng nhẹ, dễ vận động",
      detail:
        "Ưu tiên quần áo thấm hút mồ hôi, giày sneaker hoặc sandal có quai hậu giúp bạn thoải mái đi bộ suốt hành trình.",
    });
  }

  items.push({
    category: "health-age",
    title: "Độ tuổi, chiều cao & lưu ý sức khỏe",
    detail:
      act.attractionDetails?.ageOrHeightNote ??
      (act.subcategory === "island-sea" || act.subcategory === "mountain-nature"
        ? "Không khuyến nghị cho phụ nữ mang thai trên 6 tháng hoặc khách có tiền sử bệnh tim mạch nặng/say sóng nghiêm trọng. Trẻ em luôn đi cùng người lớn."
        : "Phù hợp cho mọi lứa tuổi và gia đình. Vui lòng ghi chú trước nếu bạn ăn chay, dị ứng thực phẩm hoặc cần hỗ trợ xe lăn."),
  });

  items.push({
    category: "weather",
    title: "Phương án khi thời tiết thay đổi",
    detail:
      act.subcategory === "island-sea" || act.subcategory === "mountain-nature"
        ? "Các hành trình ngoài trời/biển đảo phụ thuộc điều kiện gió và sương mù. Nếu cảng vụ hoặc ban quản lý tạm ngưng vì bão, bạn được đổi ngày miễn phí hoặc hoàn tiền 100%."
        : "Dịch vụ vẫn vận hành bình thường khi mưa nhẹ; khuyến khích mang ô gấp nhỏ hoặc áo mưa mỏng vào mùa mưa địa phương.",
  });

  items.push({
    category: "tip",
    title: "Mẹo hay để trải nghiệm trọn vẹn hơn",
    detail:
      act.hubSection === "attractions"
        ? "Nên đi sớm trước 09:00 sáng hoặc sau 15:00 chiều để tránh khung giờ đoàn đông và có ánh sáng chụp ảnh đẹp nhất; sạc đầy pin điện thoại trước khi mở mã QR."
        : act.subcategory === "dining-cruise"
          ? "Nên có mặt tại bến tàu sớm 20 phút để chọn vị trí ngắm cảnh đẹp trên boong và báo trước nếu có yêu cầu thực đơn chay/không hải sản."
          : "Lưu sẵn ảnh chụp màn hình mã xác nhận ACT-... trên điện thoại phòng trường hợp khu vực núi/đảo có sóng di động yếu.",
  });

  return items;
}

function buildHowToUse(act: SeedTravelActivityBase): ActivityHowToUse {
  if (act.transferDetails) {
    return {
      ticketType: "Xác nhận điện tử (Gặp tài xế cầm bảng tên)",
      steps: [
        "Đặt dịch vụ & điền rõ số hiệu chuyến bay hoặc địa chỉ khách sạn ở mục Ghi chú.",
        "Nhận thông tin biển số xe & số điện thoại tài xế qua Email/Zalo trước 6 giờ.",
        `Gặp tài xế cầm bảng tên bạn tại ${act.meetingPoint} và xuất trình mã đơn ACT-... trên điện thoại.`,
      ],
      arrivalLeadTime: "Tài xế có mặt trước giờ hẹn 15 phút (miễn phí chờ 60 phút với chuyến bay)",
      requiredDocuments: "Mã đơn LuxeStay trên điện thoại (không cần in giấy)",
    };
  }

  if (act.essentialDetails) {
    return {
      ticketType:
        act.id === "act-31"
          ? "Mã QR eSIM điện tử gửi ngay qua Email"
          : "Voucher QR điện tử xuất trình tại quầy sân bay",
      steps: [
        "Hoàn tất đặt đơn để nhận mã xác nhận tức thì trong Email và trang Tra cứu đơn.",
        act.essentialDetails.deliveryMethod,
        act.essentialDetails.activationNote,
      ],
      arrivalLeadTime:
        act.id === "act-31"
          ? "Cài đặt trong 2 phút bất cứ lúc nào trước khi khởi hành"
          : "Ghép lịch nhận tại quầy ngay khi hạ cánh (quầy phục vụ 24/7)",
      requiredDocuments:
        act.id === "act-31"
          ? "Điện thoại hỗ trợ eSIM bản quốc tế & kết nối WiFi lúc quét QR"
          : "Hộ chiếu / CCCD bản gốc + Mã đơn đặt dịch vụ LuxeStay",
    };
  }

  if (act.attractionDetails) {
    return {
      ticketType: "Vé QR điện tử (Không cần in giấy)",
      steps: [
        "Kiểm tra email xác nhận hoặc mở mục Tra cứu đơn (/bookings) để lấy mã QR.",
        `Di chuyển đến ${act.attractionDetails.venueAddress}.`,
        `${act.attractionDetails.entryMethod} và tận hưởng trọn ngày tham quan.`,
      ],
      arrivalLeadTime: "Có mặt trước giờ đóng cửa / giờ mở màn ít nhất 20–30 phút",
      requiredDocuments: "Mã QR trên điện thoại + giấy khai sinh/CCCD nếu cần xác minh tuổi trẻ em",
    };
  }

  return {
    ticketType: "Voucher điện tử (Xuất trình trên điện thoại)",
    steps: [
      "Giữ mã xác nhận đơn ACT-... (hoặc LX-... nếu đặt kèm phòng) gửi qua Email.",
      `Có mặt đúng giờ tại ${act.meetingPoint} và xuất trình mã đơn cho hướng dẫn viên/nhân viên lễ tân.`,
      "Tham gia trải nghiệm theo khung giờ đã chọn — mọi vé vào cửa trong gói đã được chuẩn bị sẵn.",
    ],
    arrivalLeadTime: "Vui lòng có mặt trước giờ khởi hành 15 phút",
    requiredDocuments: "Ảnh chụp CCCD/Hộ chiếu (phục vụ đăng ký bảo hiểm du lịch & lệnh cảng tàu nếu có)",
  };
}

function buildCancellationPolicy(act: SeedTravelActivityBase): ActivityCancellationPolicy {
  return {
    headline: act.freeCancellation
      ? "Hủy miễn phí hoàn tiền 100% trước 24 giờ"
      : "Không hoàn hủy sau khi xuất mã vé",
    refundWindowHours: 24,
    rules: [
      "Hủy trước 24 giờ so với ngày/giờ sử dụng đã đặt: hoàn lại 100% giá trị đơn không thu phí.",
      "Hủy trong vòng 24 giờ trước giờ khởi hành hoặc không có mặt (No-show): không áp dụng hoàn tiền.",
      "Nếu đặt ghép gói cùng chỗ nghỉ (Stay + Activity Bundle), bạn có thể hủy riêng lẻ từng dịch vụ này tại trang Chi tiết đơn mà vẫn giữ nguyên phòng đã đặt.",
    ],
    rescheduleNote:
      "Hỗ trợ đổi ngày hoặc đổi khung giờ miễn phí 01 lần (tùy tình trạng suất trống) nếu yêu cầu trước 24 giờ.",
    weatherNote:
      "Trường hợp bất khả kháng do bão, cấm biển hoặc điểm tham quan tạm đóng cửa vì lý do an toàn, LuxeStay hoàn 100% hoặc bảo lưu sang ngày khác.",
  };
}

function buildSuitableFor(act: SeedTravelActivityBase): string[] {
  switch (act.subcategory) {
    case "theme-park":
      return ["Gia đình có trẻ nhỏ", "Nhóm bạn trẻ", "Cặp đôi"];
    case "heritage-culture":
      return ["Yêu văn hóa & lịch sử", "Gia đình đa thế hệ", "Khách quốc tế"];
    case "island-sea":
      return ["Yêu biển & lặn san hô", "Nhóm bạn", "Cặp đôi"];
    case "mountain-nature":
      return ["Yêu thiên nhiên & nhiếp ảnh", "Nhóm bạn", "Cặp đôi"];
    case "local-workshop":
      return ["Trải nghiệm bản địa", "Gia đình & trẻ em", "Khách đi một mình"];
    case "airport-transfer":
      return ["Gia đình nhiều hành lý", "Khách công tác", "Nhóm bạn"];
    case "sim-wifi":
      return ["Mọi du khách", "Nhóm bạn / Gia đình", "Làm việc từ xa"];
    case "fast-track":
      return ["Khách công tác VIP", "Gia đình có trẻ nhỏ / người lớn tuổi", "Chuyến bay giờ cao điểm"];
    case "live-show":
      return ["Cặp đôi", "Gia đình đa thế hệ", "Yêu nghệ thuật"];
    case "spa-wellness":
      return ["Nghỉ dưỡng phục hồi", "Cặp đôi", "Gia đình"];
    case "dining-cruise":
      return ["Cặp đôi lãng mạn", "Tín đồ ẩm thực", "Nhóm bạn & Gia đình"];
  }
}

export function enrichSeedActivity<T extends SeedTravelActivityBase>(
  raw: T
): T & TravelActivity {
  const cover = raw.images[0] ?? `/images/activities/${raw.id}.jpg`;
  const baseNoExt = cover.replace(/\.jpg$/i, "");
  const images =
    raw.images.length >= 3
      ? [...raw.images]
      : [cover, `${baseNoExt}-2.jpg`, `${baseNoExt}-3.jpg`];

  const captions = ACTIVITY_IMAGE_CAPTIONS[raw.id] ?? [
    raw.title,
    `Trải nghiệm thực tế tại ${raw.destinationCity}`,
    `Khoảnh khắc nổi bật trong hành trình ${raw.destinationCity}`,
  ];

  const enriched: TravelActivity = {
    ...raw,
    images: Object.freeze(images) as string[],
    imageCaptions: Object.freeze([...captions]) as string[],
    excluded: Object.freeze(raw.excluded ?? buildExcluded(raw)) as string[],
    itinerary: Object.freeze(
      (raw.itinerary ?? buildItinerary(raw)).map((step) => Object.freeze({ ...step }))
    ) as ActivityItineraryStep[],
    knowBeforeYouGo: Object.freeze(
      (raw.knowBeforeYouGo ?? buildKnowBeforeYouGo(raw)).map((item) => Object.freeze({ ...item }))
    ) as ActivityGoodToKnowItem[],
    howToUse: Object.freeze({
      ...(raw.howToUse ?? buildHowToUse(raw)),
      steps: Object.freeze([...(raw.howToUse ?? buildHowToUse(raw)).steps]) as string[],
    }),
    cancellationPolicy: Object.freeze({
      ...(raw.cancellationPolicy ?? buildCancellationPolicy(raw)),
      rules: Object.freeze([
        ...(raw.cancellationPolicy ?? buildCancellationPolicy(raw)).rules,
      ]) as string[],
    }),
    suitableFor: Object.freeze(raw.suitableFor ?? buildSuitableFor(raw)) as string[],
    languages: Object.freeze(raw.languages ?? ["Tiếng Việt", "Tiếng Anh"]) as string[],
  };

  return Object.freeze(enriched) as T & TravelActivity;
}

export function enrichTransferActivities(
  items: readonly SeedTransferServiceBase[]
): readonly TransferService[] {
  return Object.freeze(items.map((item) => enrichSeedActivity(item) as TransferService));
}

export function enrichTravelActivities(
  items: readonly SeedTravelActivityBase[]
): readonly TravelActivity[] {
  return Object.freeze(items.map((item) => enrichSeedActivity(item)));
}
