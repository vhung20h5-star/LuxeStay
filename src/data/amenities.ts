import type {
  AmenityCatalogItem,
  AmenityCategoryMeta,
  AmenityFilterOption,
} from "@/types";

export const AMENITY_CATEGORIES: AmenityCategoryMeta[] = [
  {
    id: "pool-beach",
    label: "Hồ bơi & Bãi biển",
    shortLabel: "Hồ bơi",
    iconName: "Waves",
    description: "Hồ bơi vô cực, bể nước ấm, bãi biển riêng và khu vực thư giãn mặt nước",
  },
  {
    id: "sports-recreation",
    label: "Thể thao & Giải trí",
    shortLabel: "Thể thao",
    iconName: "Dumbbell",
    description: "Phòng gym, yoga, thể thao dưới nước, đạp xe, trekking và hoạt động giải trí",
  },
  {
    id: "dining",
    label: "Ẩm thực & Đồ uống",
    shortLabel: "Ẩm thực",
    iconName: "UtensilsCrossed",
    description: "Nhà hàng, buffet sáng, bữa sáng nổi, quầy bar, tiệc BBQ và lớp học nấu ăn",
  },
  {
    id: "hotel-spa",
    label: "Dịch vụ khách sạn & Spa",
    shortLabel: "Dịch vụ & Spa",
    iconName: "Sparkles",
    description: "Lễ tân 24/7, quản gia riêng, spa trị liệu, xông hơi, giặt ủi và chăm sóc phòng",
  },
  {
    id: "transport",
    label: "Đưa đón & Di chuyển",
    shortLabel: "Đưa đón",
    iconName: "Car",
    description: "Xe đưa đón sân bay, xe điện nội khu, tàu cao tốc, thuê xe và bãi đỗ xe",
  },
  {
    id: "room-family",
    label: "Tiện nghi phòng & Gia đình",
    shortLabel: "Phòng & Gia đình",
    iconName: "Home",
    description: "Wifi tốc độ cao, nhà thông minh, bếp riêng, lò sưởi, khu trẻ em và thú cưng",
  },
  {
    id: "security-general",
    label: "An ninh & Tiện ích chung",
    shortLabel: "An ninh",
    iconName: "ShieldCheck",
    description: "An ninh 24/7, khóa thông minh, két sắt, y tế trực và hỗ trợ hành lý",
  },
];

export const AMENITY_FILTER_OPTIONS: AmenityFilterOption[] = [
  { key: "pool", label: "Hồ bơi", iconName: "Waves" },
  { key: "beach", label: "Bãi biển riêng", iconName: "Umbrella" },
  { key: "sports-gym", label: "Thể thao & Gym", iconName: "Dumbbell" },
  { key: "dining", label: "Nhà hàng & Ẩm thực", iconName: "UtensilsCrossed" },
  { key: "spa-wellness", label: "Spa & Thư giãn", iconName: "Sparkles" },
  { key: "transport-shuttle", label: "Đưa đón & Di chuyển", iconName: "Car" },
  { key: "bbq-campfire", label: "BBQ & Lửa trại", iconName: "Flame" },
  { key: "bath-fireplace", label: "Bồn tắm & Lò sưởi", iconName: "Bath" },
  { key: "family-pet", label: "Gia đình & Thú cưng", iconName: "Baby" },
];

export const AMENITY_CATALOG: Record<string, AmenityCatalogItem> = {
  // 1. Hồ bơi & Bãi biển
  "infinity-pool": {
    id: "infinity-pool",
    category: "pool-beach",
    name: "Hồ bơi vô cực ngoài trời",
    shortLabel: "Hồ bơi vô cực",
    iconName: "Waves",
    description:
      "Hồ bơi tràn bờ thiết kế mở hướng trọn khung cảnh thiên nhiên, trang bị khu nước nông cho trẻ nhỏ, khăn tắm sạch và ghế nằm phơi nắng miễn phí.",
    image:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1000&q=80",
    hours: "06:00 – 21:00 hằng ngày",
    location: "Khu trung tâm ngoài trời",
    pricingType: "included",
    notes: "Vui lòng mặc đồ bơi phù hợp; trẻ em dưới 12 tuổi cần có người lớn đi kèm.",
    filterKeys: ["pool"],
  },
  "heated-pool": {
    id: "heated-pool",
    category: "pool-beach",
    name: "Bể bơi nước ấm 4 mùa",
    shortLabel: "Bể bơi nước ấm",
    iconName: "Waves",
    description:
      "Bể bơi duy trì nhiệt độ ổn định 30–32°C quanh năm, lý tưởng để thư giãn ngắm mây trời ngay cả trong thời tiết se lạnh vùng cao.",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=80",
    hours: "06:30 – 21:30 hằng ngày",
    location: "Tầng 3 • Khu Wellness",
    pricingType: "included",
    notes: "Có sẵn khăn bông ấm, phòng thay đồ và tủ khóa cá nhân tại khu vực bể bơi.",
    filterKeys: ["pool"],
  },
  "bio-pool": {
    id: "bio-pool",
    category: "pool-beach",
    name: "Hồ bơi tự nhiên lọc sinh học",
    shortLabel: "Hồ bơi sinh học",
    iconName: "Waves",
    description:
      "Hồ bơi sử dụng hệ thống lọc tuần hoàn sinh học hạn chế clo, dịu nhẹ cho làn da nhạy cảm và hòa mình giữa vườn cây bản địa.",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80",
    hours: "06:30 – 20:00 hằng ngày",
    location: "Khu vườn trung tâm ven hồ",
    pricingType: "included",
    notes: "Không sử dụng hóa chất mạnh; vui lòng tắm tráng trước khi xuống hồ.",
    filterKeys: ["pool"],
  },
  "private-beach": {
    id: "private-beach",
    category: "pool-beach",
    name: "Bãi biển riêng & lối đi trực tiếp",
    shortLabel: "Bãi biển riêng",
    iconName: "Umbrella",
    description:
      "Dải cát trắng riêng tư chỉ dành cho khách lưu trú, có nhân viên cứu hộ trực ban ngày, ô che nắng, ghế dài và dịch vụ phục vụ đồ uống tận nơi.",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80",
    hours: "05:30 – 19:00 hằng ngày",
    location: "Mặt biển nội khu",
    pricingType: "included",
    notes: "Tuân thủ cờ báo an toàn sóng biển; có vòi tắm nước ngọt ngay lối lên.",
    filterKeys: ["beach"],
  },
  "outdoor-wooden-tub": {
    id: "outdoor-wooden-tub",
    category: "room-family",
    name: "Bồn tắm gỗ ngoài trời ngắm cảnh",
    shortLabel: "Bồn tắm gỗ",
    iconName: "Bath",
    description:
      "Bồn tắm gỗ Pơ-mu thơm dịu đặt tại ban công riêng tư, kèm muối tắm thảo mộc giúp bạn ngâm mình thư giãn giữa thiên nhiên.",
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80",
    hours: "Sử dụng tự do 24/7",
    location: "Ban công riêng từng căn",
    pricingType: "included",
    notes: "Nước nóng có sẵn 24/7; có thể yêu cầu thêm gói thảo dược tắm thơm tại lễ tân.",
    filterKeys: ["bath-fireplace", "spa-wellness"],
  },
  "sun-loungers": {
    id: "sun-loungers",
    category: "pool-beach",
    name: "Ghế tắm nắng & Cabana ven hồ",
    shortLabel: "Cabana thư giãn",
    iconName: "Sun",
    description:
      "Khu vực chòi cabana rèm trắng và ghế dài tắm nắng đặt dọc hồ bơi/bãi biển, phục vụ khăn lạnh và nước detox miễn phí.",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
    hours: "07:00 – 19:00 hằng ngày",
    location: "Ven hồ bơi & bãi cát",
    pricingType: "included",
    notes: "Phục vụ theo thứ tự đến trước; có thể báo nhân viên giữ cabana riêng cho gia đình.",
    filterKeys: ["pool", "beach"],
  },

  // 2. Thể thao & Giải trí
  "gym-fitness": {
    id: "gym-fitness",
    category: "sports-recreation",
    name: "Phòng Gym & Fitness hiện đại",
    shortLabel: "Phòng Gym",
    iconName: "Dumbbell",
    description:
      "Trang bị đầy đủ máy chạy bộ, xe đạp tập, tạ đa năng chuẩn quốc tế cùng tường kính lớn đón ánh sáng tự nhiên và nước uống miễn phí.",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80",
    hours: "06:00 – 22:00 hằng ngày",
    location: "Tầng 2 • Khu Thể thao",
    pricingType: "included",
    notes: "Khuyến nghị mang giày thể thao kín mũi; có sẵn khăn tập và nước khoáng.",
    filterKeys: ["sports-gym"],
  },
  "yoga-class": {
    id: "yoga-class",
    category: "sports-recreation",
    name: "Lớp Yoga & Thiền buổi sáng",
    shortLabel: "Yoga buổi sáng",
    iconName: "Sun",
    description:
      "Buổi tập Yoga kéo giãn và hít thở nhẹ nhàng cùng huấn luyện viên trong không gian mở đón bình minh, trang bị sẵn thảm tập cao cấp.",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
    hours: "06:30 – 07:30 hằng ngày",
    location: "Sân gỗ ngắm bình minh",
    pricingType: "free-reservation",
    notes: "Nên đăng ký trước tối hôm trước để khu nghỉ dưỡng chuẩn bị sẵn thảm và nước thảo mộc.",
    filterKeys: ["sports-gym", "spa-wellness"],
  },
  "tennis-pickleball": {
    id: "tennis-pickleball",
    category: "sports-recreation",
    name: "Sân Tennis & Pickleball ngoài trời",
    shortLabel: "Tennis / Pickleball",
    iconName: "Trophy",
    description:
      "Sân thể thao tiêu chuẩn có hệ thống đèn chiếu sáng buổi tối, cho mượn vợt và bóng miễn phí cho khách lưu trú đặt khung giờ trước.",
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80",
    hours: "06:00 – 21:00 hằng ngày",
    location: "Khu thể thao ngoài trời",
    pricingType: "free-reservation",
    notes: "Đặt trước ít nhất 2 giờ; phụ thu nhỏ nếu yêu cầu bật đèn cao áp sau 18:00.",
    filterKeys: ["sports-gym"],
  },
  "sup-snorkeling": {
    id: "sup-snorkeling",
    category: "sports-recreation",
    name: "Chèo ván SUP, Kayak & Kính lặn san hô",
    shortLabel: "SUP & Lặn biển",
    iconName: "Compass",
    description:
      "Trải nghiệm chèo SUP hoặc Kayak ngắm vịnh biển êm ả lúc bình minh/hoàng hôn, đi kèm áo phao chuẩn an toàn và bộ kính lặn ống thở.",
    image:
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1000&q=80",
    hours: "07:00 – 17:30 (tùy thời tiết)",
    location: "Trạm thể thao bãi biển",
    pricingType: "free-reservation",
    notes: "Miễn phí 2 giờ/ngày cho khách lưu trú; nhân viên sẽ hướng dẫn kỹ thuật cơ bản.",
    filterKeys: ["sports-gym", "beach"],
  },
  "wooden-boat": {
    id: "wooden-boat",
    category: "sports-recreation",
    name: "Thuyền gỗ chèo dạo quanh hồ",
    shortLabel: "Chèo thuyền gỗ",
    iconName: "Ship",
    description:
      "Tự tay chèo thuyền gỗ mộc mạc quanh đầm sen và chân núi đá vôi mờ sương, có áo phao đầy đủ và nhân viên hỗ trợ cập bến.",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
    hours: "06:00 – 17:30 hằng ngày",
    location: "Bến thuyền nội khu",
    pricingType: "included",
    notes: "Khung giờ đẹp nhất là 06:30 – 08:30 sáng khi hồ còn sương sớm.",
    filterKeys: ["sports-gym"],
  },
  "bicycle-free": {
    id: "bicycle-free",
    category: "sports-recreation",
    name: "Xe đạp dạo phố & khám phá thiên nhiên",
    shortLabel: "Xe đạp miễn phí",
    iconName: "Bike",
    description:
      "Cung cấp xe đạp cổ điển kèm giỏ mây và ghế ngồi trẻ em (nếu cần), lý tưởng để đạp xe qua đồng lúa, đường ven biển hoặc trung tâm thị trấn.",
    image:
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1000&q=80",
    hours: "06:00 – 20:00 hằng ngày",
    location: "Sảnh lễ tân • Bãi xe đạp",
    pricingType: "included",
    notes: "Kèm khóa xe và bản đồ gợi ý các cung đường đạp xe đẹp nhất quanh khu vực.",
    filterKeys: ["sports-gym", "transport-shuttle"],
  },
  "guided-trekking": {
    id: "guided-trekking",
    category: "sports-recreation",
    name: "Tour trekking rừng suối cùng hướng dẫn viên",
    shortLabel: "Trekking thiên nhiên",
    iconName: "Mountain",
    description:
      "Hành trình đi bộ xuyên rừng thông/thác suối kéo dài 3 giờ cùng hướng dẫn viên bản địa am hiểu địa hình, bao gồm gậy leo núi và đồ ăn nhẹ.",
    image:
      "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80",
    hours: "07:30 – 11:00 hằng ngày",
    location: "Tập trung tại sảnh chính",
    pricingType: "paid",
    price: 350000,
    priceUnit: "gói 2 khách",
    notes: "Nên mang giày bám tốt và áo khoác nhẹ; đặt trước tối thiểu 12 giờ.",
    filterKeys: ["sports-gym"],
  },
  "outdoor-cinema": {
    id: "outdoor-cinema",
    category: "sports-recreation",
    name: "Rạp chiếu phim ngoài trời dưới bầu trời sao",
    shortLabel: "Chiếu phim ngoài trời",
    iconName: "Film",
    description:
      "Màn chiếu lớn giữa bãi cỏ với ghế lười êm ái, chăn ấm và bỏng ngô nóng hổi, mang đến buổi tối lãng mạn giữa thiên nhiên.",
    image:
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1000&q=80",
    hours: "19:30 – 22:00 (Thứ 6 – Chủ nhật & đặt riêng)",
    location: "Bãi cỏ sân vườn trung tâm",
    pricingType: "free-reservation",
    notes: "Tùy điều kiện thời tiết không mưa; khách có thể chọn trước danh sách phim yêu thích.",
    filterKeys: ["family-pet"],
  },
  "netflix-projector": {
    id: "netflix-projector",
    category: "sports-recreation",
    name: "Máy chiếu phim HD & Tài khoản Netflix",
    shortLabel: "Máy chiếu Netflix",
    iconName: "Tv",
    description:
      "Máy chiếu độ phân giải Full HD kết nối sẵn Netflix, YouTube và loa Bluetooth âm thanh ấm áp ngay trong phòng ngủ.",
    image:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80",
    hours: "Sử dụng tự do 24/7",
    location: "Trong phòng nghỉ",
    pricingType: "included",
    notes: "Điều khiển và hướng dẫn kết nối nhanh đặt ngay bàn trà.",
    filterKeys: ["family-pet"],
  },
  "reading-lounge": {
    id: "reading-lounge",
    category: "sports-recreation",
    name: "Góc đọc sách & Trò chơi Boardgame",
    shortLabel: "Thư viện & Boardgame",
    iconName: "BookOpen",
    description:
      "Không gian yên tĩnh với hàng trăm đầu sách văn học, du lịch và bộ boardgame nhóm (Uno, Ma sói, Catan...) miễn phí mượn về phòng.",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1000&q=80",
    hours: "07:00 – 22:00 hằng ngày",
    location: "Phòng sinh hoạt chung",
    pricingType: "included",
    notes: "Vui lòng hoàn trả sách và boardgame tại kệ trước khi check-out.",
    filterKeys: ["family-pet"],
  },

  // 3. Ẩm thực & Đồ uống
  "buffet-breakfast": {
    id: "buffet-breakfast",
    category: "dining",
    name: "Bữa sáng Buffet Á – Âu cao cấp",
    shortLabel: "Buffet sáng",
    iconName: "UtensilsCrossed",
    description:
      "Thực đơn hơn 40 món nóng hổi mỗi sáng: phở/bún đặc sản địa phương, bánh mì nướng bơ Pháp, trứng chế biến tại quầy, trái cây nhiệt đới và cà phê pha máy.",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
    hours: "06:30 – 10:00 hằng ngày",
    location: "Nhà hàng chính tầng trệt",
    pricingType: "included",
    notes: "Có khu vực món chay và thực đơn riêng cho trẻ nhỏ; báo trước nếu dị ứng thực phẩm.",
    filterKeys: ["dining"],
  },
  "in-room-breakfast": {
    id: "in-room-breakfast",
    category: "dining",
    name: "Bữa sáng nóng hổi phục vụ tại phòng",
    shortLabel: "Bữa sáng tại phòng",
    iconName: "Coffee",
    description:
      "Thưởng thức khay bữa sáng thơm ngon ngay tại ban công ngắm cảnh với món Việt nóng hổi hoặc bánh mì trứng ốp la kèm nước ép tươi.",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
    hours: "07:00 – 09:30 hằng ngày",
    location: "Phục vụ trực tiếp tại phòng",
    pricingType: "included",
    notes: "Vui lòng chọn món và khung giờ phục vụ vào tối hôm trước.",
    filterKeys: ["dining"],
  },
  "floating-breakfast": {
    id: "floating-breakfast",
    category: "dining",
    name: "Bữa sáng nổi trên mặt nước (Floating Breakfast)",
    shortLabel: "Floating Breakfast",
    iconName: "UtensilsCrossed",
    description:
      "Khay mây nổi trang trí hoa tươi gồm bánh ngọt, trái cây nhiệt đới, trứng Benedict, nước ép và vang nổ phục vụ ngay tại hồ bơi riêng.",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=80",
    hours: "07:30 – 10:00 (đặt trước)",
    location: "Hồ bơi riêng tại Villa/Resort",
    pricingType: "paid",
    price: 450000,
    priceUnit: "khay 2 khách",
    notes: "Cần đặt trước ít nhất 12 giờ để bếp chuẩn bị hoa tươi và thực đơn theo yêu cầu.",
    filterKeys: ["dining", "pool"],
  },
  "signature-restaurant": {
    id: "signature-restaurant",
    category: "dining",
    name: "Nhà hàng ẩm thực bản địa & Quốc tế",
    shortLabel: "Nhà hàng đặc sản",
    iconName: "UtensilsCrossed",
    description:
      "Phục vụ bữa trưa và bữa tối với nguồn nguyên liệu tươi sạch trong ngày, kết hợp tinh hoa đặc sản địa phương và ẩm thực Âu hiện đại.",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80",
    hours: "11:00 – 22:00 hằng ngày",
    location: "Khu nhà hàng trung tâm",
    pricingType: "free-reservation",
    notes: "Đặt bàn trước miễn phí để ưu tiên vị trí view đẹp ngắm hoàng hôn/thung lũng.",
    filterKeys: ["dining"],
  },
  "sky-lounge-bar": {
    id: "sky-lounge-bar",
    category: "dining",
    name: "Quầy Bar Cocktail & Sky Lounge",
    shortLabel: "Quầy Bar & Lounge",
    iconName: "Wine",
    description:
      "Không gian chill sang trọng phục vụ cocktail thủ công, rượu vang tuyển chọn, bia thủ công và tapas nhẹ trong tiếng nhạc acoustic dịu êm.",
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80",
    hours: "16:00 – 23:30 hằng ngày",
    location: "Khu ven biển / Tầng thượng",
    pricingType: "free-reservation",
    notes: "Khung giờ Happy Hour 17:00 – 19:00 mua 1 tặng 1 cho khách lưu trú.",
    filterKeys: ["dining"],
  },
  "garden-bbq": {
    id: "garden-bbq",
    category: "dining",
    name: "Set tiệc nướng BBQ sân vườn riêng tư",
    shortLabel: "Tiệc nướng BBQ",
    iconName: "Flame",
    description:
      "Chuẩn bị trọn gói bếp than hồng, thịt bò Mỹ/hải sản tươi ướp sẵn, rau củ Đà Lạt, nước chấm đặc biệt và nhân viên hỗ trợ dọn dẹp sau tiệc.",
    image:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1000&q=80",
    hours: "17:30 – 21:30 hằng ngày",
    location: "Sân vườn ngoài trời",
    pricingType: "paid",
    price: 550000,
    priceUnit: "set 2–4 khách",
    notes: "Nếu chỉ mượn bếp nướng tự chuẩn bị đồ ăn, phụ thu than & vệ sinh tại chỗ nhẹ hơn.",
    filterKeys: ["dining", "bbq-campfire"],
  },
  "campfire-roast": {
    id: "campfire-roast",
    category: "dining",
    name: "Đốt lửa trại tối & Nướng khoai bắp",
    shortLabel: "Lửa trại buổi tối",
    iconName: "Flame",
    description:
      "Quây quần bên bếp lửa trại ấm áp giữa tiết trời se lạnh, thưởng thức khoai mật, bắp nướng và trà gừng nóng trong không khí thân mật.",
    image:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=80",
    hours: "19:30 – 22:00 hằng ngày",
    location: "Sân lửa trại rừng thông",
    pricingType: "free-reservation",
    notes: "Tổ chức miễn phí khi trời không mưa; đăng ký trước để chuẩn bị củi và khoai bắp.",
    filterKeys: ["bbq-campfire", "dining"],
  },
  "candlelight-dinner": {
    id: "candlelight-dinner",
    category: "dining",
    name: "Bữa tối lãng mạn thắp nến riêng tư",
    shortLabel: "Bữa tối lãng mạn",
    iconName: "Wine",
    description:
      "Set menu 5 món cao cấp do bếp trưởng thiết kế riêng, bàn ăn trang trí hoa tươi & nến lung linh kèm 1 chai rượu vang tuyển chọn.",
    image:
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1000&q=80",
    hours: "18:30 – 21:30 (đặt trước)",
    location: "Bãi biển riêng / Hang đá / Ban công riêng",
    pricingType: "paid",
    price: 1450000,
    priceUnit: "set 2 khách",
    notes: "Có thể tùy chỉnh lời chúc kỷ niệm hoặc trang trí hoa theo yêu cầu cá nhân.",
    filterKeys: ["dining"],
  },
  "cooking-class": {
    id: "cooking-class",
    category: "dining",
    name: "Lớp học nấu món đặc sản địa phương",
    shortLabel: "Lớp học nấu ăn",
    iconName: "ChefHat",
    description:
      "Cùng đầu bếp bản địa chọn nguyên liệu tươi và thực hành chế biến 3 món đặc sản trứ danh, sau đó thưởng thức thành quả ngay tại lớp.",
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80",
    hours: "10:00 – 12:00 & 15:00 – 17:00",
    location: "Bếp vườn hữu cơ",
    pricingType: "paid",
    price: 390000,
    priceUnit: "gói 2 khách",
    notes: "Đặt trước tối thiểu 6 giờ; tặng kèm bộ công thức nấu ăn lưu niệm.",
    filterKeys: ["dining"],
  },
  "artisan-tea-coffee": {
    id: "artisan-tea-coffee",
    category: "dining",
    name: "Trà thảo mộc & Cà phê hạt đặc sản",
    shortLabel: "Trà & Cà phê hạt",
    iconName: "Coffee",
    description:
      "Trang bị sẵn cà phê hạt Arabica rang mộc, trà hoa cúc/atisô thảo mộc, ấm đun cổ ngỗng và phin/máy pha ngay trong phòng.",
    image:
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80",
    hours: "Phục vụ 24/7 tại phòng",
    location: "Quầy minibar trong phòng",
    pricingType: "included",
    notes: "Bổ sung miễn phí hằng ngày khi dọn phòng.",
    filterKeys: ["dining"],
  },

  // 4. Dịch vụ khách sạn & Spa
  "reception-24h": {
    id: "reception-24h",
    category: "hotel-spa",
    name: "Lễ tân & Hỗ trợ khách 24/7",
    shortLabel: "Lễ tân 24/7",
    iconName: "ConciergeBell",
    description:
      "Đội ngũ lễ tân chuyên nghiệp song ngữ Việt – Anh trực 24/7 hỗ trợ nhận/trả phòng nhanh, đặt tour, gọi xe và giải đáp mọi yêu cầu.",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
    hours: "24/7 suốt tuần",
    location: "Sảnh chính (Lobby)",
    pricingType: "included",
    notes: "Hỗ trợ nhận phòng muộn miễn phí nếu thông báo trước giờ đến.",
    filterKeys: [],
  },
  "private-butler": {
    id: "private-butler",
    category: "hotel-spa",
    name: "Quản gia riêng (Private Butler 24/7)",
    shortLabel: "Quản gia riêng",
    iconName: "Sparkles",
    description:
      "Mỗi biệt thự có một quản gia chuyên trách sắp xếp lịch trình nghỉ dưỡng, đặt bàn ăn, chuẩn bị bồn tắm hoa và hỗ trợ riêng qua Zalo/WhatsApp.",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80",
    hours: "24/7 theo yêu cầu riêng",
    location: "Phục vụ tận biệt thự",
    pricingType: "included",
    notes: "Thông tin liên hệ quản gia được gửi trước ngày check-in 24 giờ.",
    filterKeys: ["spa-wellness"],
  },
  "herbal-spa": {
    id: "herbal-spa",
    category: "hotel-spa",
    name: "Spa trị liệu toàn thân & Thảo dược thiên nhiên",
    shortLabel: "Spa trị liệu",
    iconName: "Sparkles",
    description:
      "Liệu trình massage đá nóng, tinh dầu hữu cơ hoặc tắm lá thuốc bản địa kéo dài 60 phút giúp giải tỏa căng thẳng và phục hồi năng lượng sâu.",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80",
    hours: "09:00 – 21:00 hằng ngày",
    location: "Khu Wellness & Spa",
    pricingType: "paid",
    price: 550000,
    priceUnit: "suất 60 phút",
    notes: "Nên đặt trước khung giờ mong muốn; tặng kèm trà gừng mật ong sau liệu trình.",
    filterKeys: ["spa-wellness"],
  },
  "sauna-steam": {
    id: "sauna-steam",
    category: "hotel-spa",
    name: "Phòng xông hơi khô Sauna & Xông ướt tinh dầu",
    shortLabel: "Xông hơi Sauna",
    iconName: "Flame",
    description:
      "Phòng xông gỗ thông Phần Lan và phòng xông ướt sả chanh tách biệt nam – nữ, giúp đào thải độc tố và ngủ ngon hơn.",
    image:
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80",
    hours: "08:00 – 21:00 hằng ngày",
    location: "Khu Wellness tầng 3",
    pricingType: "included",
    notes: "Phù hợp kết hợp sau khi tập gym hoặc bơi lội.",
    filterKeys: ["spa-wellness"],
  },
  "daily-housekeeping": {
    id: "daily-housekeeping",
    category: "hotel-spa",
    name: "Dọn phòng & Thay khăn hằng ngày",
    shortLabel: "Dọn phòng hằng ngày",
    iconName: "Sparkles",
    description:
      "Đội ngũ buồng phòng vệ sinh, thay khăn tắm sạch, bổ sung nước suối và đồ dùng cá nhân hằng ngày vào khung giờ bạn chọn.",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
    hours: "09:00 – 16:00 hằng ngày",
    location: "Tại phòng lưu trú",
    pricingType: "included",
    notes: "Có thể treo biển 'Không làm phiền' nếu muốn giữ sự riêng tư tuyệt đối.",
    filterKeys: [],
  },
  "express-laundry": {
    id: "express-laundry",
    category: "hotel-spa",
    name: "Dịch vụ giặt ủi lấy nhanh trong ngày",
    shortLabel: "Giặt ủi nhanh",
    iconName: "Shirt",
    description:
      "Giặt sấy thơm dịu, là phẳng quần áo cao cấp và giao lại tận phòng trong vòng 6 giờ kể từ lúc nhận đồ.",
    image:
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80",
    hours: "Nhận đồ 07:00 – 18:00",
    location: "Thu nhận trực tiếp tại phòng",
    pricingType: "paid",
    price: 150000,
    priceUnit: "gói tiêu chuẩn / kỳ nghỉ",
    notes: "Áp dụng tối đa 5 kg quần áo thường; đồ lụa/vest báo riêng khi giao.",
    filterKeys: [],
  },
  "room-service-24h": {
    id: "room-service-24h",
    category: "hotel-spa",
    name: "Phục vụ đồ ăn & đồ uống tại phòng 24/7",
    shortLabel: "Room Service 24/7",
    iconName: "ConciergeBell",
    description:
      "Đặt món ăn nhẹ, bữa chính hoặc đồ uống giao tận cửa phòng bất cứ lúc nào qua điện thoại nội bộ hoặc mã QR trên bàn.",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80",
    hours: "Phục vụ 24/7",
    location: "Giao trực tiếp tận phòng",
    pricingType: "included",
    notes: "Không tính thêm phí phục vụ giao phòng; thanh toán theo món đã gọi.",
    filterKeys: ["dining"],
  },

  // 5. Đưa đón & Di chuyển
  "airport-shuttle": {
    id: "airport-shuttle",
    category: "transport",
    name: "Xe đưa đón sân bay riêng 2 chiều",
    shortLabel: "Đưa đón sân bay",
    iconName: "Plane",
    description:
      "Xe 7 chỗ đời mới máy lạnh mát mẻ cùng tài xế riêng cầm biển tên đón tại ga đến và đưa tiễn đúng giờ ra sân bay.",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
    hours: "Phục vụ 24/7 theo giờ bay",
    location: "Đón tại ga đến sân bay ↔ Sảnh chỗ nghỉ",
    pricingType: "paid",
    price: 350000,
    priceUnit: "chuyến 2 chiều",
    notes: "Vui lòng ghi chú mã chuyến bay hoặc giờ dự kiến hạ cánh ở bước Checkout.",
    filterKeys: ["transport-shuttle"],
  },
  "electric-buggy": {
    id: "electric-buggy",
    category: "transport",
    name: "Xe điện đưa đón nội khu & trung tâm",
    shortLabel: "Xe điện đưa đón",
    iconName: "Bus",
    description:
      "Xe điện chạy êm ái phục vụ di chuyển trong khuôn viên rộng lớn hoặc các chuyến cố định miễn phí vào khu trung tâm/phố cổ.",
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80",
    hours: "07:00 – 22:00 (cách 30 phút/chuyến)",
    location: "Sảnh đón khách chính",
    pricingType: "free-reservation",
    notes: "Đăng ký giữ chỗ trước 30 phút cho các khung giờ cao điểm buổi tối.",
    filterKeys: ["transport-shuttle"],
  },
  "private-speedboat": {
    id: "private-speedboat",
    category: "transport",
    name: "Tàu cao tốc riêng đón từ bến đất liền",
    shortLabel: "Tàu cao tốc riêng",
    iconName: "Ship",
    description:
      "Di chuyển riêng tư 20 phút bằng tàu cao tốc sang trọng qua làn nước trong xanh, kèm nước chào mừng và khăn lạnh trên tàu.",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80",
    hours: "07:30 – 18:00 theo lịch nhận phòng",
    location: "Bến tàu riêng đất liền ↔ Cầu tàu Resort",
    pricingType: "free-reservation",
    notes: "Đã bao gồm miễn phí trong giá villa; cần đăng ký trước giờ đến bến ít nhất 24 giờ.",
    filterKeys: ["transport-shuttle"],
  },
  "motorbike-car-rental": {
    id: "motorbike-car-rental",
    category: "transport",
    name: "Thuê xe máy tay ga / Ô tô tự lái giao tận nơi",
    shortLabel: "Thuê xe khám phá",
    iconName: "Car",
    description:
      "Xe tay ga đời mới bảo dưỡng định kỳ, giao trực tiếp tại chỗ nghỉ kèm 2 mũ bảo hiểm sạch, áo mưa và hướng dẫn cung đường đẹp.",
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80",
    hours: "Giao nhận 07:00 – 21:00",
    location: "Giao tận cửa chỗ nghỉ",
    pricingType: "paid",
    price: 180000,
    priceUnit: "gói thuê 24 giờ",
    notes: "Mang theo CCCD/GPLX hợp lệ khi nhận xe; hỗ trợ đổi xe nhanh nếu có sự cố.",
    filterKeys: ["transport-shuttle"],
  },
  "smart-parking": {
    id: "smart-parking",
    category: "transport",
    name: "Bãi đỗ xe ô tô miễn phí có mái che",
    shortLabel: "Bãi đỗ xe ô tô",
    iconName: "Car",
    description:
      "Khu vực đỗ xe rộng rãi có mái che, bảo vệ trông giữ 24/7 và thang máy lên thẳng sảnh nhận phòng tiện lợi.",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
    hours: "Ra vào tự do 24/7",
    location: "Tầng hầm / Sân đỗ nội khu",
    pricingType: "included",
    notes: "Miễn phí cho khách lưu trú; hỗ trợ trạm sạc xe điện tại một số vị trí.",
    filterKeys: ["transport-shuttle"],
  },
  "yacht-squid-tour": {
    id: "yacht-squid-tour",
    category: "transport",
    name: "Tour du thuyền ngắm hoàng hôn & Câu mực đêm",
    shortLabel: "Tour du thuyền biển",
    iconName: "Ship",
    description:
      "Hành trình 3 giờ lênh đênh trên vịnh biển đón hoàng hôn rực rỡ, trải nghiệm câu mực đêm và thưởng thức cháo mực nóng ngay trên boong tàu.",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
    hours: "16:30 – 19:30 hằng ngày",
    location: "Khởi hành từ cầu tàu bãi biển",
    pricingType: "paid",
    price: 890000,
    priceUnit: "gói 2 khách",
    notes: "Bao gồm cần câu, áo phao, trái cây và bữa nhẹ; hoàn tiền 100% nếu thời tiết xấu.",
    filterKeys: ["transport-shuttle", "sports-gym", "beach"],
  },

  // 6. Tiện nghi phòng & Gia đình
  "high-speed-wifi": {
    id: "high-speed-wifi",
    category: "room-family",
    name: "Wifi cáp quang tốc độ cao toàn khu",
    shortLabel: "Wifi tốc độ cao",
    iconName: "Wifi",
    description:
      "Đường truyền cáp quang riêng băng thông lớn phủ sóng ổn định từ phòng ngủ đến ban công và hồ bơi, đáp ứng mượt họp trực tuyến và làm việc từ xa.",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
    hours: "Hoạt động 24/7",
    location: "Phủ sóng toàn bộ chỗ nghỉ",
    pricingType: "included",
    notes: "Tên mạng và mã QR kết nối nhanh đặt tại bàn làm việc trong phòng.",
    filterKeys: [],
  },
  "smart-home": {
    id: "smart-home",
    category: "room-family",
    name: "Hệ thống Smart Home & Điều khiển giọng nói",
    shortLabel: "Smart Home",
    iconName: "Home",
    description:
      "Điều khiển rèm cửa tự động, kịch bản ánh sáng thư giãn, điều hòa và âm thanh chỉ bằng một chạm hoặc giọng nói.",
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80",
    hours: "Sử dụng tự do 24/7",
    location: "Toàn bộ căn hộ/phòng nghỉ",
    pricingType: "included",
    notes: "Có bảng điều khiển cảm ứng gắn tường kèm hướng dẫn minh họa dễ dùng.",
    filterKeys: [],
  },
  "full-kitchen": {
    id: "full-kitchen",
    category: "room-family",
    name: "Khu bếp riêng đầy đủ dụng cụ nấu ăn",
    shortLabel: "Bếp tự nấu",
    iconName: "UtensilsCrossed",
    description:
      "Trang bị bếp từ, tủ lạnh, lò vi sóng, nồi chảo, bộ chén đĩa gốm và gia vị cơ bản để bạn thoải mái tự tay chuẩn bị bữa ăn ấm cúng.",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
    hours: "Sử dụng tự do 24/7",
    location: "Khu bếp trong căn",
    pricingType: "included",
    notes: "Vui lòng tắt bếp sau khi sử dụng; có sẵn nước rửa chén hữu cơ.",
    filterKeys: ["dining", "family-pet"],
  },
  "wood-fireplace": {
    id: "wood-fireplace",
    category: "room-family",
    name: "Lò sưởi củi ấm áp / Hệ thống sưởi phòng",
    shortLabel: "Lò sưởi ấm áp",
    iconName: "Flame",
    description:
      "Không gian luôn ấm cúng suốt đêm lạnh nhờ lò sưởi củi tự nhiên (kèm sẵn củi khô) hoặc hệ thống sưởi sàn giữ nhiệt êm ái.",
    image:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1000&q=80",
    hours: "Sử dụng tự do 24/7",
    location: "Phòng khách / Phòng ngủ",
    pricingType: "included",
    notes: "Nhân viên sẽ hỗ trợ nhóm lửa an toàn vào buổi tối nếu khách có nhu cầu.",
    filterKeys: ["bath-fireplace"],
  },
  "washer-dryer": {
    id: "washer-dryer",
    category: "room-family",
    name: "Máy giặt & Máy sấy quần áo riêng",
    shortLabel: "Máy giặt sấy",
    iconName: "Shirt",
    description:
      "Máy giặt sấy tích hợp ngay trong căn kèm nước giặt xả dịu nhẹ, cực kỳ tiện lợi cho gia đình có trẻ nhỏ hoặc kỳ nghỉ dài ngày.",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1000&q=80",
    hours: "Sử dụng tự do 24/7",
    location: "Khu logia riêng trong căn",
    pricingType: "included",
    notes: "Có sẵn bàn ủi hơi nước cầm tay trong tủ quần áo.",
    filterKeys: ["family-pet"],
  },
  "kids-club-crib": {
    id: "kids-club-crib",
    category: "room-family",
    name: "Khu vui chơi trẻ em & Cũi em bé miễn phí",
    shortLabel: "Khu trẻ em & Cũi",
    iconName: "Baby",
    description:
      "Góc vui chơi an toàn với đồ chơi gỗ giáo dục và dịch vụ lắp sẵn cũi em bé, ghế ăn dặm hoàn toàn miễn phí cho gia đình có bé dưới 3 tuổi.",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80",
    hours: "08:00 – 20:00 (Cũi lắp đặt 24/7)",
    location: "Khu Kids Club & Lắp tại phòng",
    pricingType: "free-reservation",
    notes: "Đăng ký trước khi đặt phòng để chỗ nghỉ bố trí sẵn cũi trước giờ check-in.",
    filterKeys: ["family-pet"],
  },
  "pet-friendly": {
    id: "pet-friendly",
    category: "room-family",
    name: "Thân thiện thú cưng (Pet-Friendly)",
    shortLabel: "Cho phép thú cưng",
    iconName: "PawPrint",
    description:
      "Chào đón các bé cún/mèo đồng hành cùng kỳ nghỉ của bạn, cung cấp sẵn bát ăn uống và khu sân vườn rộng rãi cho thú cưng chạy nhảy.",
    image:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=80",
    hours: "Áp dụng suốt kỳ nghỉ",
    location: "Phòng nghỉ & Khu sân vườn",
    pricingType: "free-reservation",
    notes: "Vui lòng đăng ký trước để chủ nhà chuẩn bị khay vệ sinh và dọn dẹp chuyên biệt.",
    filterKeys: ["family-pet"],
  },

  // 7. An ninh & Tiện ích chung
  "security-24h": {
    id: "security-24h",
    category: "security-general",
    name: "Hệ thống an ninh & Camera giám sát 24/7",
    shortLabel: "An ninh 24/7",
    iconName: "ShieldCheck",
    description:
      "Đội ngũ bảo vệ túc trực ngày đêm kết hợp camera khu vực công cộng, đảm bảo sự an tâm tuyệt đối suốt kỳ nghỉ.",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
    hours: "24/7 suốt tuần",
    location: "Cổng chính & Khu vực công cộng",
    pricingType: "included",
    notes: "Chỉ giám sát khu vực lối đi chung, tôn trọng tuyệt đối quyền riêng tư trong phòng.",
    filterKeys: [],
  },
  "smart-lock": {
    id: "smart-lock",
    category: "security-general",
    name: "Khóa cửa thông minh & Tự check-in linh hoạt",
    shortLabel: "Khóa thông minh",
    iconName: "KeyRound",
    description:
      "Mỗi lượt đặt phòng được cấp một mã PIN riêng tự động đổi sau mỗi khách, cho phép nhận phòng chủ động kể cả khi đến muộn.",
    image:
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80",
    hours: "Hoạt động 24/7",
    location: "Cửa chính từng căn/phòng",
    pricingType: "included",
    notes: "Mã mở cửa sẽ được gửi riêng qua Zalo/SMS trước giờ nhận phòng 2 tiếng.",
    filterKeys: [],
  },
  "in-room-safe": {
    id: "in-room-safe",
    category: "security-general",
    name: "Két sắt điện tử bảo mật trong phòng",
    shortLabel: "Két sắt cá nhân",
    iconName: "Lock",
    description:
      "Két sắt điện tử kích thước vừa laptop 15 inch và hộ chiếu, giúp bạn yên tâm cất giữ tài sản giá trị khi đi bơi hoặc tham quan.",
    image:
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80",
    hours: "Sử dụng tự do 24/7",
    location: "Bên trong tủ quần áo",
    pricingType: "included",
    notes: "Cài đặt mật khẩu cá nhân dễ dàng chỉ trong 10 giây.",
    filterKeys: [],
  },
  "medical-support": {
    id: "medical-support",
    category: "security-general",
    name: "Tủ sơ cứu & Hỗ trợ y tế khẩn cấp 24/7",
    shortLabel: "Hỗ trợ y tế 24/7",
    iconName: "HeartPulse",
    description:
      "Trang bị bộ sơ cứu chuẩn y tế và kết nối trực tiếp với phòng khám/bác sĩ đối tác gần nhất khi khách cần hỗ trợ sức khỏe đột xuất.",
    image:
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80",
    hours: "Trực hỗ trợ 24/7",
    location: "Quầy lễ tân / Phòng y tế",
    pricingType: "included",
    notes: "Liên hệ ngay hotline nội bộ hoặc lễ tân để được hỗ trợ trong vòng 5 phút.",
    filterKeys: [],
  },
  "luggage-storage": {
    id: "luggage-storage",
    category: "security-general",
    name: "Ký gửi hành lý miễn phí trước/sau giờ phòng",
    shortLabel: "Gửi hành lý miễn phí",
    iconName: "Luggage",
    description:
      "Gửi hành lý an toàn có thẻ niêm phong hoàn toàn miễn phí nếu bạn đến sớm trước 14:00 hoặc muốn dạo chơi thêm sau khi trả phòng 12:00.",
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80",
    hours: "06:00 – 23:00 hằng ngày",
    location: "Quầy lễ tân chính",
    pricingType: "included",
    notes: "Có hỗ trợ phòng tắm tráng nhanh nếu khách cần thay đồ trước giờ ra sân bay.",
    filterKeys: [],
  },
};
